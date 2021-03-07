export const validate: (data: CellData[]) => boolean[] = (data) => {
  let conflicts: boolean[] = Array(81).fill(false)
  let arraySolution = []
  const cellNumbers = data.map((cell) => cell.number)
  for (let index = 0; index < 9; index++) {
    arraySolution.push(cellNumbers.slice(index * 9, index * 9 + 9))
  }

  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 9; x++) {
      let value = arraySolution[y][x]
      if (value) {
        // Validate row
        for (let x2 = x + 1; x2 < 9; x2++) {
          if (arraySolution[y][x2] == value) {
            conflicts[9 * y + x2] = true
            conflicts[9 * y + x] = true
          }
        }

        // Validate column
        for (let y2 = y + 1; y2 < 9; y2++) {
          if (arraySolution[y2][x] == value) {
            conflicts[9 * y2 + x] = true
            conflicts[9 * y + x] = true
          }
        }

        // Validate square
        let startY = Math.floor(y / 3) * 3
        for (let y2 = startY; y2 < startY + 3; y2++) {
          let startX = Math.floor(x / 3) * 3
          for (let x2 = startX; x2 < startX + 3; x2++) {
            if ((x2 != x || y2 != y) && arraySolution[y2][x2] == value) {
              conflicts[9 * y2 + x2] = true
            }
          }
        }
      }
    }
  }
  return conflicts
}

export const getPixel = (imgData: ImageData, index: number) =>
  imgData.data.slice(index * 4, index * 4 + 4)
