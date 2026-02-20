import { cellCenter, gridViewBox, overlayStyle } from './svgHelpers'

type ArrowData = { arrows: { circle: BoardIndex[]; line: BoardIndex[][] }[] }

export default class Arrow implements SolverExtension {
  extensionName = 'arrow'
  data: ArrowData = { arrows: [] }
  private cellArrows: { [index: string]: { arrow: number; isCircle: boolean }[] } = {}

  isRelevant = (index: BoardIndex): boolean => {
    return `${index[0]},${index[1]}` in this.cellArrows
  }

  getCellConflicts = (board: BoardState, index: BoardIndex): number[][] => {
    const num = board[index[0]][index[1]].number
    if (!num) return []
    const key = `${index[0]},${index[1]}`
    const memberships = this.cellArrows[key]
    if (!memberships) return []
    const conflicts: number[][] = []
    for (const { arrow, isCircle } of memberships) {
      const arrowDef = this.data.arrows[arrow]
      if (isCircle) {
        // Circle cell: line digits must sum to this number
        // For each line cell, no specific pairwise conflict expressible simply
        // Just enforce no repeats on the line (basic constraint)
        for (const line of arrowDef.line) {
          for (const [r, c] of line) {
            if (r === index[0] && c === index[1]) continue
            // Line cells can't equal the circle value (would need sum > circle)
            if (arrowDef.line.reduce((s, l) => s + l.length, 0) > 1) {
              conflicts.push([r, c, num])
            }
          }
        }
      }
    }
    return conflicts
  }

  serializeConstraints = (_rows: number, cols: number): SolverConstraint[] => {
    return this.data.arrows.map((arrow) => ({
      type: 'arrow' as const,
      circle: arrow.circle.map(([r, c]) => r * cols + c),
      lines: arrow.line.map((line) => line.map(([r, c]) => r * cols + c)),
    }))
  }

  getBoardOverlay = (_board: BoardState, cellSize: number): any => {
    if (this.data.arrows.length === 0) return null
    const cc = (r: number, c: number) => cellCenter(r, c, cellSize)
    const circleRadius = cellSize * 0.35
    const lineWidth = cellSize * 0.08

    return (
      <svg style={overlayStyle()} viewBox={gridViewBox(cellSize, _board.length, _board[0].length)}>
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#AAAAAA" opacity="0.6" />
          </marker>
        </defs>
        {this.data.arrows.map((arrow, ai) => {
          const circleCenter = cc(arrow.circle[0][0], arrow.circle[0][1])
          return (
            <g key={ai}>
              <circle cx={circleCenter.x} cy={circleCenter.y} r={circleRadius} fill="none" stroke="#AAAAAA" strokeWidth={2} opacity={0.6} />
              {arrow.line.map((linePath, li) => {
                const points = linePath.map(([r, c]) => { const p = cc(r, c); return `${p.x},${p.y}` }).join(' ')
                return (
                  <polyline key={li} points={points} fill="none" stroke="#AAAAAA" strokeWidth={lineWidth} strokeLinecap="round" strokeLinejoin="round" opacity={0.6} markerEnd="url(#arrowhead)" />
                )
              })}
            </g>
          )
        })}
      </svg>
    )
  }

  private updateMetadata = () => {
    this.cellArrows = {}
    for (let ai = 0; ai < this.data.arrows.length; ai++) {
      const arrow = this.data.arrows[ai]
      for (const [r, c] of arrow.circle) {
        const key = `${r},${c}`
        if (!(key in this.cellArrows)) this.cellArrows[key] = []
        this.cellArrows[key].push({ arrow: ai, isCircle: true })
      }
      for (const line of arrow.line) {
        for (const [r, c] of line) {
          const key = `${r},${c}`
          if (!(key in this.cellArrows)) this.cellArrows[key] = []
          this.cellArrows[key].push({ arrow: ai, isCircle: false })
        }
      }
    }
  }

  loadPuzzleData = (data: ArrowData) => {
    this.data = data
    this.updateMetadata()
  }
}
