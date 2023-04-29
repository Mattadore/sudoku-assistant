import * as React from 'react'
import chroma from 'chroma-js'

// get a differential tree btwn two states
export const getDiff = (
  starting: CellData[],
  updated: CellData[],
): { [key: string]: CellDiff } => {
  const diff: { [key: string]: CellDiff } = {}
  for (const key in updated) {
    if (starting[key] !== updated[key]) {
      diff[key] = {}
      let prop: keyof CellData
      for (prop in updated[key]) {
        if (updated[key][prop] !== starting[key][prop]) {
          // ts does not know how to handle this
          ;(diff[key][prop] as any) = updated[key][prop] as any
        }
      }
      if (Object.keys(diff[key]).length === 0) {
        delete diff[key]
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

  const rows = Array(imageData.height).fill(0)
  const columns = Array(imageData.width).fill(0)

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
    // const intensity = (pixelData[0] + pixelData[1] + pixelData[2]) / 3
    if (lightness < 20) {
      //is black
      columns[x] = ++columns[x]
      rows[y] = ++rows[y]
    }
    // if (lightness > 50 && (lightness > 95 || chromaValue > 10)) {
    if (lightness > 95) {
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

  for (let index = 0; index < imageData.data.length / 4; ++index) {
    const x = index % imageData.width
    const y = Math.floor(index / imageData.width)
    const pixelData = getPixel(imageData, index)
    const [hue, chromaValue, lightness] = chroma([
      ...pixelData.slice(0, 3),
    ]).hcl()
    // const intensity = (pixelData[0] + pixelData[1] + pixelData[2]) / 3
    if (
      (x > rightEdge || x < leftEdge || y < topEdge || y > bottomEdge) &&
      lightness > 95
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

export function getPixel(imgData: ImageData, index: number) {
  return imgData.data.slice(index * 4, index * 4 + 4)
}
