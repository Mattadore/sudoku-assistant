const ORTHO: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]]

type MinMaxType = 'minimum' | 'maximum'

export default class MinMax implements SolverExtension {
  extensionName: string
  private type: MinMaxType
  private cells: Set<string> = new Set()

  constructor(type: MinMaxType) {
    this.type = type
    this.extensionName = type
  }

  isRelevant = (index: BoardIndex): boolean => {
    return this.cells.has(`${index[0]},${index[1]}`)
  }

  getCellConflicts = (board: BoardState, index: BoardIndex): number[][] => {
    const num = board[index[0]][index[1]].number
    if (!num) return []
    if (!this.isRelevant(index)) return []
    const rows = board.length
    const cols = board[0].length
    const conflicts: number[][] = []
    for (const [dr, dc] of ORTHO) {
      const r = index[0] + dr
      const c = index[1] + dc
      if (r < 0 || r >= rows || c < 0 || c >= cols) continue
      const badNums: number[] = []
      if (this.type === 'minimum') {
        // Neighbors must be > num, so they conflict on numbers <= num
        for (let n = 1; n <= num; n++) badNums.push(n)
      } else {
        // Neighbors must be < num, so they conflict on numbers >= num
        for (let n = num; n <= 9; n++) badNums.push(n)
      }
      conflicts.push([r, c, ...badNums])
    }
    return conflicts
  }

  loadPuzzleData = (data: { cells: BoardIndex[] }) => {
    this.cells = new Set(data.cells.map(([r, c]) => `${r},${c}`))
  }
}
