import chroma from 'chroma-js'
import { produce } from 'immer'

export const preprocessImage = (imageData: ImageData) => {
  const canvas: HTMLCanvasElement = document.getElementById(
    'sudoku-image',
  ) as HTMLCanvasElement
  const annotationCanvas: HTMLCanvasElement = document.getElementById(
    'sudoku-annotations',
  ) as HTMLCanvasElement

  const rows: number[] = Array(imageData.height).fill(0)
  const columns: number[] = Array(imageData.width).fill(0)

  let newData: Uint8ClampedArray = new Uint8ClampedArray([...imageData.data])

  let annotationData: Uint8ClampedArray = new Uint8ClampedArray([...newData])

  for (let index = 0; index < imageData.data.length / 4; ++index) {
    const x = index % imageData.width
    const y = Math.floor(index / imageData.width)
    const pixelData = getPixel(imageData, index)
    const [_hue, _chromaValue, lightness] = chroma([
      ...pixelData.slice(0, 3),
    ]).hcl()
    const transparency = pixelData[3]
    //if black
    if (lightness < 20 && transparency > 100) {
      columns[x] = ++columns[x]
      rows[y] = ++rows[y]
    }
    // if white or colored or semi transparent
    if (
      lightness > 50 &&
      (lightness > 95 || transparency < 100)
    ) {
      // remove from the annotation data
      annotationData[index * 4 + 3] = 0
    }
  }

  const rowMax = Math.max(...rows)
  const columnMax = Math.max(...columns)

  const leftEdge = columns.findIndex((value) => value > columnMax * 0.8)
  const rightEdge =
    columns.length -
    1 -
    columns.reverse().findIndex((value) => value > columnMax * 0.8)

  const topEdge = rows.findIndex((value) => value > rowMax * 0.8)
  const bottomEdge =
    rows.length - 1 - rows.reverse().findIndex((value) => value > rowMax * 0.8)

  // clean up the background pixels
  for (let index = 0; index < imageData.data.length / 4; ++index) {
    const x = index % imageData.width
    const y = Math.floor(index / imageData.width)
    const pixelData = getPixel(imageData, index)
    const [_hue, _chromaValue, lightness] = chroma([
      ...pixelData.slice(0, 3),
    ]).hcl()
    const transparency = pixelData[3]
    if (
      (x > rightEdge || x < leftEdge || y < topEdge || y > bottomEdge) &&
      (lightness > 95 || transparency < 80)
    ) {
      newData[index * 4 + 3] = 0
    }
  }

  const newImageData = new ImageData(
    new Uint8ClampedArray(newData),
    imageData.width,
  )

  const newAnnotationData = new ImageData(
    new Uint8ClampedArray(annotationData),
    imageData.width,
  )

  canvas.height = newImageData.height
  canvas.width = newImageData.width
  annotationCanvas.height = newAnnotationData.height
  annotationCanvas.width = newAnnotationData.width
  canvas.getContext('2d')?.putImageData(newImageData, 0, 0)
  annotationCanvas.getContext('2d')?.putImageData(newAnnotationData, 0, 0)
  return [leftEdge, rightEdge, topEdge, bottomEdge]
}

export const getPixel = (imgData: ImageData, index: number) => {
  return imgData.data.slice(index * 4, index * 4 + 4)
}

export const splitIndex = (index: string) => {
  return index.split(',').map((i) => parseInt(i))
}

export const stringIndex = (row: number, col: number) => {
  return row + ',' + col
}

export const stringIndexFromBoardIndex = (index: BoardIndex) => {
  return index[0] + ',' + index[1]
}

export const removeConflicts = (
  matrix: ConflictMatrix,
  cell: BoardIndex,
  extension: string,
) => {
  const cellConflictData: ConflictData = matrix[cell[0]][cell[1]]
  // for each cell that depends on this cell's number
  for (const [dependency, numbers] of Object.entries(
    cellConflictData.dependencies[extension],
  )) {
    const [row, col] = splitIndex(dependency)
    // for each number in that cell that depends on this cell
    for (const number of numbers) {
      const conflicts = matrix[row][col].conflicts
      // remove the dependency from this cell to that number in the other cell
      conflicts[number - 1] = conflicts[number - 1].filter((index) => {
        return (
          index[0] != cell[0] || index[1] != cell[1] || index[2] != extension
        )
      })
    }
  }
  // reset this cell's dependency map
  cellConflictData.dependencies[extension] = {}
}

export const addConflicts = (
  matrix: ConflictMatrix,
  cell: BoardIndex,
  conflicts: number[][],
  extension: string,
) => {
  const thisCellConflict = matrix[cell[0]][cell[1]]
  for (const conflict of conflicts) {
    const row = conflict[0]
    const col = conflict[1]
    // for each number conflict
    for (let i = 2; i < conflict.length; ++i) {
      const cons = matrix[row][col].conflicts
      cons[conflict[i] - 1].push([cell[0], cell[1], extension])
      const index = stringIndex(row, col)
      if (!(index in thisCellConflict.dependencies[extension])) {
        thisCellConflict.dependencies[extension][index] = []
      }
      thisCellConflict.dependencies[extension][index].push(conflict[i])
    }
  }
}

export const inplaceMerge = <T extends Object>(obj: T, diff: Diff<T>) => {
  if (obj === undefined || obj === null) return
  for (let [key, value] of Object.entries(diff)) {
    if (!(key in obj)) {
      ;(obj as any)[key] = value
    } else if (
      typeof value == 'boolean' ||
      typeof value == 'number' ||
      typeof value == 'string' ||
      value == null
    ) {
      obj[key as keyof T] = value as any
    } else if (value instanceof Array) {
      obj[key as keyof T] = value as any
    } else {
      inplaceMerge((obj as any)[key], value as any)
    }
  }
}

export const createMerge = <T extends Object>(obj: T, diff: Diff<T>) => {
  return produce(obj, (draft) => {
    inplaceMerge(draft as T, diff)
  })
}

export function extensionColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
    hash |= 0
  }
  return `hsl(${Math.abs(hash) % 360}, 70%, 50%)`
}
