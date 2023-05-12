export default class Sudoku implements SolverExtension {
  extensionName = 'Sudoku'
  getCellConflicts = (board: BoardState, index: BoardIndex) => {
    const num = board[index[0]][index[1]].number
    if (!num) return []
    const numRows = board.length
    const numCols = board[0].length
    const conflicts: [number, number, number][] = []
    for (let row = 0; row < numRows; ++row) {
      if (row !== index[0]) {
        conflicts.push([row, index[1], num])
      }
    }
    for (let col = 0; col < numCols; ++col) {
      if (col !== index[1]) {
        conflicts.push([index[0], col, num])
      }
    }
    const boxrow = Math.floor(index[0] / 3)
    const boxcol = Math.floor(index[1] / 3)
    for (let innerRow = 0; innerRow < 3; ++innerRow) {
      for (let innerCol = 0; innerCol < 3; ++innerCol) {
        const row = boxrow * 3 + innerRow
        const col = boxcol * 3 + innerCol
        if (row == index[0] && col == index[1]) continue
        conflicts.push([row, col, num])
      }
    }
    return conflicts
  }
}
