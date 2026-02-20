import {
  cellCenter,
  gridViewBox,
  overlayStyle,
} from './svgHelpers'

const ORTHO: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]]

type MinMaxType = 'minimum' | 'maximum'

export default class MinMax implements SolverExtension {
  extensionName: string
  private type: MinMaxType
  private cells: Set<string> = new Set()
  private cellList: BoardIndex[] = []

  constructor(type: MinMaxType) {
    this.type = type
    this.extensionName = type
  }

  isRelevant = (index: BoardIndex): boolean => {
    const key = `${index[0]},${index[1]}`
    if (this.cells.has(key)) return true
    // Also relevant if any orthogonal neighbor is a min/max cell
    for (const [dr, dc] of ORTHO) {
      if (this.cells.has(`${index[0] + dr},${index[1] + dc}`)) return true
    }
    return false
  }

  getCellConflicts = (board: BoardState, index: BoardIndex): number[][] => {
    const num = board[index[0]][index[1]].number
    if (!num) return []
    const rows = board.length
    const cols = board[0].length
    const key = `${index[0]},${index[1]}`
    const conflicts: number[][] = []

    if (this.cells.has(key)) {
      // This IS a min/max cell — constrain its neighbors
      for (const [dr, dc] of ORTHO) {
        const r = index[0] + dr
        const c = index[1] + dc
        if (r < 0 || r >= rows || c < 0 || c >= cols) continue
        const badNums: number[] = []
        if (this.type === 'minimum') {
          // Neighbors must be > num
          for (let n = 1; n <= num; n++) badNums.push(n)
        } else {
          // Neighbors must be < num
          for (let n = num; n <= board.length; n++) badNums.push(n)
        }
        conflicts.push([r, c, ...badNums])
      }
    } else {
      // This is a NEIGHBOR of a min/max cell — constrain the min/max cell
      for (const [dr, dc] of ORTHO) {
        const r = index[0] + dr
        const c = index[1] + dc
        if (r < 0 || r >= rows || c < 0 || c >= cols) continue
        if (!this.cells.has(`${r},${c}`)) continue
        const badNums: number[] = []
        if (this.type === 'minimum') {
          // The min cell must be < num
          for (let n = num; n <= board.length; n++) badNums.push(n)
        } else {
          // The max cell must be > num
          for (let n = 1; n <= num; n++) badNums.push(n)
        }
        conflicts.push([r, c, ...badNums])
      }
    }

    return conflicts
  }

  serializeConstraints = (rows: number, cols: number): SolverConstraint[] => {
    const ORTHO: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]]
    return this.cellList.map(([r, c]) => {
      const neighbors: number[] = []
      for (const [dr, dc] of ORTHO) {
        const nr = r + dr, nc = c + dc
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) neighbors.push(nr * cols + nc)
      }
      return { type: 'min_max' as const, cell: r * cols + c, neighbors, isMax: this.type === 'maximum' }
    })
  }

  getBoardOverlay = (_board: BoardState, cellSize: number): any => {
    if (this.cellList.length === 0) return null
    const isMin = this.type === 'minimum'
    const r = cellSize * 0.18
    return (
      <svg
        style={overlayStyle()}
        viewBox={gridViewBox(cellSize, _board.length, _board[0].length)}
      >
        {this.cellList.map(([row, col]) => {
          const { x, y } = cellCenter(row, col, cellSize)
          // Upward triangle for maximum, downward triangle for minimum
          const dy = isMin ? r : -r
          return (
            <polygon
              key={`${row},${col}`}
              points={`${x - r},${y - dy} ${x + r},${y - dy} ${x},${y + dy}`}
              fill="rgba(140, 140, 140, 0.35)"
              stroke="rgba(100, 100, 100, 0.6)"
              strokeWidth={1.5}
            />
          )
        })}
      </svg>
    )
  }

  loadPuzzleData = (data: { cells: BoardIndex[] }) => {
    this.cellList = data.cells
    this.cells = new Set(data.cells.map(([r, c]) => `${r},${c}`))
  }
}
