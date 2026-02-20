import { cellCenter, gridViewBox, overlayStyle } from './svgHelpers'

type DiagonalType = 'positive' | 'negative'

export default class Diagonal implements SolverExtension {
  extensionName: string
  private type: DiagonalType
  private gridSize = 9

  constructor(type: DiagonalType) {
    this.type = type
    this.extensionName = type === 'positive' ? 'diagonal+' : 'diagonal-'
  }

  loadPuzzleData = (data: { size?: number }) => {
    if (data?.size) this.gridSize = data.size
  }

  isRelevant = (index: BoardIndex): boolean => {
    if (this.type === 'negative') {
      return index[0] === index[1]
    }
    // positive: bottom-left to top-right
    return index[0] + index[1] === this.gridSize - 1
  }

  getCellConflicts = (board: BoardState, index: BoardIndex): number[][] => {
    const num = board[index[0]][index[1]].number
    if (!num) return []
    const size = board.length
    if (!this.isRelevant(index)) return []
    const conflicts: number[][] = []
    for (let i = 0; i < size; i++) {
      let r: number, c: number
      if (this.type === 'negative') {
        r = i
        c = i
      } else {
        r = size - 1 - i
        c = i
      }
      if (r === index[0] && c === index[1]) continue
      conflicts.push([r, c, num])
    }
    return conflicts
  }

  serializeConstraints = (rows: number, cols: number): SolverConstraint[] => {
    const cells: number[] = []
    for (let i = 0; i < Math.min(rows, cols); i++) {
      if (this.type === 'negative') {
        cells.push(i * cols + i)
      } else {
        cells.push((rows - 1 - i) * cols + i)
      }
    }
    return [{ type: 'unique_group', cells }]
  }

  getBoardOverlay = (_board: BoardState, cellSize: number): any => {
    const cc = (r: number, c: number) => cellCenter(r, c, cellSize)
    const rows = _board.length
    const cols = _board[0]?.length ?? rows

    const start =
      this.type === 'negative' ? cc(0, 0) : cc(rows - 1, 0)
    const end =
      this.type === 'negative' ? cc(rows - 1, cols - 1) : cc(0, cols - 1)

    return (
      <svg style={overlayStyle()} viewBox={gridViewBox(cellSize, rows, cols)}>
        <line
          x1={start.x}
          y1={start.y}
          x2={end.x}
          y2={end.y}
          stroke="#4488CC"
          strokeWidth={2}
          opacity={0.4}
        />
      </svg>
    )
  }
}
