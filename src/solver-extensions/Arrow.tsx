import { cellCenter, gridViewBox, overlayStyle } from './svgHelpers'
import { getCurrentTheme } from '../themes'
import type { ConstraintHandler } from '../solver/solverTypes'

export const solverHandler: ConstraintHandler = {
  cellsOf: (con) => {
    const cells = [...con.circle]
    for (const l of con.lines) cells.push(...l)
    return cells
  },
  propagate: (_cell, _digit, con, maxDigit, board, _domains, _removeBit, intersect) => {
    if (con.circle.length !== 1) return true
    const circleCell = con.circle[0]
    const lineFlat: number[] = []
    for (const l of con.lines) lineFlat.push(...l)
    let lineSum = 0
    const lineEmpty: number[] = []
    for (const c of lineFlat) {
      if (board[c] > 0) lineSum += board[c]
      else lineEmpty.push(c)
    }
    if (lineEmpty.length === 0) {
      if (lineSum < 1 || lineSum > maxDigit) return false
      return intersect(circleCell, 1 << lineSum)
    }
    if (board[circleCell] > 0) {
      const remaining = board[circleCell] - lineSum
      const k = lineEmpty.length
      if (remaining < k || remaining > k * maxDigit) return false
      if (k === 1) return intersect(lineEmpty[0], 1 << remaining)
      for (const c of lineEmpty) {
        const lo = remaining - (k - 1) * maxDigit
        const hi = remaining - (k - 1)
        let mask = 0
        for (let d = Math.max(1, lo); d <= Math.min(maxDigit, hi); d++) mask |= 1 << d
        if (mask === 0) return false
        if (!intersect(c, mask)) return false
      }
    }
    return true
  },
}

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
            <polygon points="0 0, 8 3, 0 6" fill={getCurrentTheme().overlay.line} opacity="0.6" />
          </marker>
        </defs>
        {this.data.arrows.map((arrow, ai) => {
          const circleCenter = cc(arrow.circle[0][0], arrow.circle[0][1])
          return (
            <g key={ai}>
              <circle cx={circleCenter.x} cy={circleCenter.y} r={circleRadius} fill="none" stroke={getCurrentTheme().overlay.line} strokeWidth={2} opacity={0.6} />
              {arrow.line.map((linePath, li) => {
                const points = linePath.map(([r, c]) => { const p = cc(r, c); return `${p.x},${p.y}` }).join(' ')
                return (
                  <polyline key={li} points={points} fill="none" stroke={getCurrentTheme().overlay.line} strokeWidth={lineWidth} strokeLinecap="round" strokeLinejoin="round" opacity={0.6} markerEnd="url(#arrowhead)" />
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
