const ORTHO: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]]

export default class NonConsecutive implements SolverExtension {
  extensionName = 'nonconsecutive'

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
