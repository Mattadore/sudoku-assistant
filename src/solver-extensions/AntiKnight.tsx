const KNIGHT_MOVES: [number, number][] = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2],
  [1, -2], [1, 2], [2, -1], [2, 1],
]

export default class AntiKnight implements SolverExtension {
  extensionName = 'antiknight'

  getCellConflicts = (board: BoardState, index: BoardIndex): number[][] => {
    const num = board[index[0]][index[1]].number
    if (!num) return []
    const rows = board.length
    const cols = board[0].length
    const conflicts: number[][] = []
    for (const [dr, dc] of KNIGHT_MOVES) {
      const r = index[0] + dr
      const c = index[1] + dc
      if (r >= 0 && r < rows && c >= 0 && c < cols) {
        conflicts.push([r, c, num])
      }
    }
    return conflicts
  }
}
