import type { ConstraintHandler } from '../solver/solverTypes'

const ORTHO: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]]

export const solverHandler: ConstraintHandler = {
  cellsOf: (_con, N) => Array.from({ length: N }, (_, i) => i),
  propagate: (cell, digit, con, maxDigit, _board, _domains, removeBit) => {
    const row = Math.floor(cell / con.cols), col = cell % con.cols
    for (const [dr, dc] of ORTHO) {
      const r = row + dr, c = col + dc
      if (r >= 0 && r < con.rows && c >= 0 && c < con.cols) {
        const neighbor = r * (con.cols as number) + c
        if (digit - 1 >= 1 && !removeBit(neighbor, 1 << (digit - 1))) return false
        if (digit + 1 <= maxDigit && !removeBit(neighbor, 1 << (digit + 1))) return false
      }
    }
    return true
  },
}

export default class NonConsecutive implements SolverExtension {
  extensionName = 'nonconsecutive'

  serializeConstraints = (rows: number, cols: number): SolverConstraint[] => {
    return [{ type: 'nonconsecutive', rows, cols }]
  }

  getCellConflicts = (board: BoardState, index: BoardIndex): number[][] => {
    const num = board[index[0]][index[1]].number
    if (!num) return []
    const rows = board.length
    const cols = board[0].length
    const conflicts: number[][] = []
    for (const [dr, dc] of ORTHO) {
      const r = index[0] + dr
      const c = index[1] + dc
      if (r >= 0 && r < rows && c >= 0 && c < cols) {
        const badNums: number[] = []
        if (num - 1 >= 1) badNums.push(num - 1)
        if (num + 1 <= 9) badNums.push(num + 1)
        if (badNums.length > 0) conflicts.push([r, c, ...badNums])
      }
    }
    return conflicts
  }
}
