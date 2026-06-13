export default class DisjointGroups implements SolverExtension {
  extensionName = 'disjointgroups'

  // Each of the 9 box-relative positions (e.g., top-left of every box) forms a
  // unique group — serialize as 9 unique_group constraints, reusing that handler.
  serializeConstraints = (rows: number, cols: number): SolverConstraint[] => {
    const boxRows = Math.floor(rows / 3)
    const boxCols = Math.floor(cols / 3)
    const constraints: SolverConstraint[] = []
    for (let pr = 0; pr < 3; pr++) {
      for (let pc = 0; pc < 3; pc++) {
        const cells: number[] = []
        for (let br = 0; br < boxRows; br++) {
          for (let bc = 0; bc < boxCols; bc++) {
            cells.push((br * 3 + pr) * cols + (bc * 3 + pc))
          }
        }
        constraints.push({ type: 'unique_group', cells })
      }
    }
    return constraints
  }

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
