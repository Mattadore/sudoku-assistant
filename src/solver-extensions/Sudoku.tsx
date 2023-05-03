export default class Sudoku implements SolverExtension {
  extensionName = 'Sudoku'
  isRelevant = (index: BoardIndex) => true
  getCellConflicts = (board: BoardState, index: BoardIndex) => {
    const num = board[index[0]][index[1]].number
    if (!num) return []
    const rows = board.length
    const cols = board[0].length
    const conflicts = []
    for (let row = 0; row < rows; ++row) {
      if (row !== index[0]) {
        conflicts.push([row, index[1], num])
      }
    }
    for (let col = 0; col < cols; ++col) {
      if (col !== index[1]) {
        conflicts.push([index[0], col, num])
      }
    }
    const boxrow = Math.floor(index[0] / 3)
    const boxcol = Math.floor(index[1] / 3)
    for (let x = 0; x < 3; ++x) {
      for (let y = 0; y < 3; ++y) {
        const row = boxrow * 3 + y
        const col = boxcol * 3 + x
        if (row == index[0] && col == index[1]) continue
        conflicts.push([row, col, num])
      }
    }
    return conflicts
  }
}
