type DiagonalType = 'positive' | 'negative'

export default class Diagonal implements SolverExtension {
  extensionName: string
  private type: DiagonalType

  constructor(type: DiagonalType) {
    this.type = type
    this.extensionName = type === 'positive' ? 'diagonal+' : 'diagonal-'
  }

  isRelevant = (index: BoardIndex): boolean => {
    if (this.type === 'negative') {
      return index[0] === index[1]
    }
    // positive: bottom-left to top-right
    return index[0] + index[1] === 8
  }

  getCellConflicts = (board: BoardState, index: BoardIndex): number[][] => {
    const num = board[index[0]][index[1]].number
    if (!num) return []
    if (!this.isRelevant(index)) return []
    const conflicts: number[][] = []
    for (let i = 0; i < 9; i++) {
      let r: number, c: number
      if (this.type === 'negative') {
        r = i
        c = i
      } else {
        r = 8 - i
        c = i
      }
      if (r === index[0] && c === index[1]) continue
      conflicts.push([r, c, num])
    }
    return conflicts
  }

  getBoardOverlay = (_board: BoardState, cellSize: number): any => {
    const { cellCenter, gridViewBox, overlayStyle } = require('./svgHelpers')
    const cc = (r: number, c: number) => cellCenter(r, c, cellSize)

    const start = this.type === 'negative' ? cc(0, 0) : cc(8, 0)
    const end = this.type === 'negative' ? cc(8, 8) : cc(0, 8)

    return (
      <svg style={overlayStyle()} viewBox={gridViewBox(cellSize)}>
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
