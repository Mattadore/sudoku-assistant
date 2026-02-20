export default class DisjointGroups implements SolverExtension {
  extensionName = 'disjointgroups'

  getCellConflicts = (board: BoardState, index: BoardIndex): number[][] => {
    const num = board[index[0]][index[1]].number
    if (!num) return []
    const posRow = index[0] % 3
    const posCol = index[1] % 3
    const conflicts: number[][] = []
    // All cells at the same position within their box
    for (let boxRow = 0; boxRow < 3; boxRow++) {
      for (let boxCol = 0; boxCol < 3; boxCol++) {
        const r = boxRow * 3 + posRow
        const c = boxCol * 3 + posCol
        if (r === index[0] && c === index[1]) continue
        conflicts.push([r, c, num])
      }
    }
    return conflicts
  }
}
