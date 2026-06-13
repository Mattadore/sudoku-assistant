import type { ConstraintHandler } from '../solver/solverTypes'

const KING_MOVES: [number, number][] = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
]

export const solverHandler: ConstraintHandler = {
  cellsOf: (_con, N) => Array.from({ length: N }, (_, i) => i),
  propagate: (cell, digit, con, _maxDigit, _board, _domains, removeBit) => {
    const bit = 1 << digit
    const row = Math.floor(cell / con.cols), col = cell % con.cols
    for (const [dr, dc] of KING_MOVES) {
      const r = row + dr, c = col + dc
      if (r >= 0 && r < con.rows && c >= 0 && c < con.cols) {
        if (!removeBit(r * con.cols + c, bit)) return false
      }
    }
    return true
  },
}

export default class AntiKing implements SolverExtension {
  extensionName = 'antiking'

  serializeConstraints = (rows: number, cols: number): SolverConstraint[] => {
    return [{ type: 'antiking', rows, cols }]
  }

  getCellConflicts = (board: BoardState, index: BoardIndex): number[][] => {
    const num = board[index[0]][index[1]].number
    if (!num) return []
    const rows = board.length
    const cols = board[0].length
    const conflicts: number[][] = []
    for (const [dr, dc] of KING_MOVES) {
      const r = index[0] + dr
      const c = index[1] + dc
      if (r >= 0 && r < rows && c >= 0 && c < cols) {
        conflicts.push([r, c, num])
      }
    }
    return conflicts
  }
}
