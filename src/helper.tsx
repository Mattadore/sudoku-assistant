import * as React from 'react'
import chroma from 'chroma-js'
import produce from 'immer'
import { SolverExtensionManager } from 'solver-extensions'

// get a differential tree btwn two states
export const getDiff = (
  starting: CellData[][],
  updated: CellData[][],
): { [key: string]: CellDiff } => {
  const diff: { [key: string]: CellDiff } = {}
  for (const row in updated) {
    if (starting[row] === updated[row]) continue
    for (const column in updated[row]) {
      if (starting[row][column] !== updated[row][column]) {
        const diffkey = row + ',' + column
        diff[diffkey] = {}
        let prop: keyof CellData
        for (prop in updated[row][column]) {
          if (updated[row][column][prop] !== starting[row][column][prop]) {
            // ts does not know how to handle this
            ;(diff[diffkey][prop] as any) = updated[row][column][prop] as any
          }
        }
        if (Object.keys(diff[diffkey]).length === 0) {
          delete diff[diffkey]
        }
      }
    }
  }

  return diff
}

export const getUserDiff = (
  starting: Userdata,
  updated: Userdata,
): Diff<Userdata> => {
  const diff: { [key: string]: CellDiff } = {}
  for (const row in updated) {
    if (starting[row] === updated[row]) continue
    for (const column in updated[row]) {
      if (starting[row][column] !== updated[row][column]) {
        const diffkey = row + ',' + column
        diff[diffkey] = {}
        let prop: keyof CellData
        for (prop in updated[row][column]) {
          if (updated[row][column][prop] !== starting[row][column][prop]) {
            // ts does not know how to handle this
            ;(diff[diffkey][prop] as any) = updated[row][column][prop] as any
          }
        }
        if (Object.keys(diff[diffkey]).length === 0) {
          delete diff[diffkey]
        }
      }
    }
  }

  return diff
}

export const adjacentIndices = (
  index: number,
  x: number,
  y: number,
  width: number,
  height: number,
) => {
  let indices = []
  if (x > 0) {
    indices.push(index - 1)
  }
  if (x < width - 1) {
    indices.push(index + 1)
  }
  if (y > 0) {
    indices.push(index - width)
  }
  if (y < height - 1) {
    indices.push(index + width)
  }
  return indices
}

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

  // Blacken semi-dark pixels adjacent to black ones
  // for (let index = 0; index < imageData.data.length / 4; ++index) {
  //   const x = index % imageData.width
  //   const y = Math.floor(index / imageData.width)
  //   const pixelData = getPixel(imageData, index)
  //   const [hue, saturation, value] = chroma([...pixelData.slice(0, 3)]).hsv()
  //   if (value < 0.2) {
  //     //is black
  //     columns[x] = ++columns[x]
  //     rows[y] = ++rows[y]
  //   }
  //   if (value > 0.8 || (saturation > 0.5 && Math.abs(value - 0.5) < 0.3)) {
  //     annotationData[index * 4 + 3] = 0
  //   }
  // }

  let annotationData: Uint8ClampedArray = new Uint8ClampedArray([...newData])

  for (let index = 0; index < imageData.data.length / 4; ++index) {
    const x = index % imageData.width
    const y = Math.floor(index / imageData.width)
    const pixelData = getPixel(imageData, index)
    const [hue, chromaValue, lightness] = chroma([
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
      (lightness > 95 || /* chromaValue > 10 ||*/ transparency < 100)
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

  // Figure out how many vertical bars there are
  let gap: boolean = false
  for (let x = leftEdge; x < rightEdge; ++x) {}

  // clean up the background pixels
  for (let index = 0; index < imageData.data.length / 4; ++index) {
    const x = index % imageData.width
    const y = Math.floor(index / imageData.width)
    const pixelData = getPixel(imageData, index)
    const [hue, chromaValue, lightness] = chroma([
      ...pixelData.slice(0, 3),
    ]).hcl()
    const transparency = pixelData[3]
    // const intensity = (pixelData[0] + pixelData[1] + pixelData[2]) / 3
    if (
      (x > rightEdge || x < leftEdge || y < topEdge || y > bottomEdge) &&
      (lightness > 95 || transparency < 80)
    ) {
      newData[index * 4 + 3] = 0
    }
    4
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

const recursiveMerge = <T,>(obj: T, diff: Diff<T>) => {
  for (let [key, value] of Object.entries(diff)) {
    if (
      typeof value == 'boolean' ||
      typeof value == 'number' ||
      typeof value == 'string'
    ) {
      obj[key as keyof T] = value as any
    } else if (value instanceof Array) {
      obj[key as keyof T] = value as any
    } else {
      recursiveMerge((obj as any)[key], value as any)
    }
  }
}

export const merge = <T,>(obj: T, diff: Diff<T>) => {
  return produce(obj, (draft) => {
    recursiveMerge(draft as T, diff)
  })
}

export const validate = (
  board: BoardState,
  extensionManager: SolverExtensionManager,
) => {
  let conflicts: { [key: string]: boolean } = {}
  // const size = 9
  // const makeCounted = () => {
  //   const counted = Array(size)
  //   for (let i = 0; i < size; ++i) {
  //     counted[i] = []
  //   }
  //   return counted
  // }

  // // check columns
  // for (let column = 0; column < size; ++column) {
  //   let counted = makeCounted()
  //   for (let row = 0; row < size; ++row) {
  //     if board[]

  //   }
  // }

  // for (let row = 0; row < size; ++row) {
  //   let counted = makeCounted()
  //   for (let column = 0; column < size; ++column) {
  //     if board[]

  //   }
  // }

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      let value = board[row][col].number
      if (value) {
        // Validate row
        for (let col2 = col + 1; col2 < 9; col2++) {
          if (board[row][col2].number == value) {
            conflicts[row + ',' + col2] = true
            conflicts[row + ',' + col] = true
          }
        }

        // Validate column
        for (let y2 = row + 1; y2 < 9; y2++) {
          if (board[y2][col].number == value) {
            conflicts[y2 + ',' + col] = true
            conflicts[row + ',' + col] = true
          }
        }

        // Validate square
        let startRow = Math.floor(row / 3) * 3
        for (let row2 = startRow; row2 < startRow + 3; row2++) {
          let startCol = Math.floor(col / 3) * 3
          for (let col2 = startCol; col2 < startCol + 3; col2++) {
            if (
              (col2 != col || row2 != row) &&
              board[row2][col2].number == value
            ) {
              conflicts[row2 + ',' + col2] = true
            }
          }
        }
      }
    }
  }
  const extensionConflicts = extensionManager.validate(board)
  for (const conflict in extensionConflicts) {
    conflicts[conflict] = true
  }
  return conflicts
}
