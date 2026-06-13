import { cellCenter, gridViewBox, overlayStyle } from './svgHelpers'
import { FONT_FAMILY } from '../theme'
import { getCurrentTheme } from '../themes'
import type { ConstraintHandler } from '../solver/solverTypes'

export const solverHandler: ConstraintHandler = {
  cellsOf: (con) => [con.cell0, con.cell1],
  propagate: (cell, digit, con, maxDigit, _board, _domains, _removeBit, intersect) => {
    const other = con.cell0 === cell ? con.cell1 : con.cell1 === cell ? con.cell0 : -1
    if (other === -1) return true
    const required = con.total - digit
    if (required < 1 || required > maxDigit) return false
    return intersect(other, 1 << required)
  },
}

type XVData = { pairs: { cells: [BoardIndex, BoardIndex]; value: 'X' | 'V' }[] }

export default class XV implements SolverExtension {
  extensionName = 'xv'
  data: XVData = { pairs: [] }
  private cellPairs: { [index: string]: { other: BoardIndex; sum: number }[] } = {}

  isRelevant = (index: BoardIndex): boolean => {
    return `${index[0]},${index[1]}` in this.cellPairs
  }

  getCellConflicts = (board: BoardState, index: BoardIndex): number[][] => {
    const num = board[index[0]][index[1]].number
    if (!num) return []
    const key = `${index[0]},${index[1]}`
    const pairs = this.cellPairs[key]
    if (!pairs) return []
    const conflicts: number[][] = []
    for (const { other, sum } of pairs) {
      const required = sum - num
      const badNums: number[] = []
      for (let n = 1; n <= 9; n++) {
        if (n !== required) badNums.push(n)
      }
      conflicts.push([other[0], other[1], ...badNums])
    }
    return conflicts
  }

  serializeConstraints = (_rows: number, cols: number): SolverConstraint[] => {
    return this.data.pairs.map((pair) => ({
      type: 'xv' as const,
      cell0: pair.cells[0][0] * cols + pair.cells[0][1],
      cell1: pair.cells[1][0] * cols + pair.cells[1][1],
      total: pair.value === 'X' ? 10 : 5,
    }))
  }

  getBoardOverlay = (_board: BoardState, cellSize: number): any => {
    if (this.data.pairs.length === 0) return null
    const cc = (r: number, c: number) => cellCenter(r, c, cellSize)
    return (
      <svg style={overlayStyle()} viewBox={gridViewBox(cellSize, _board.length, _board[0].length)}>
        {this.data.pairs.map((pair, i) => {
          const a = cc(pair.cells[0][0], pair.cells[0][1])
          const b = cc(pair.cells[1][0], pair.cells[1][1])
          const mx = (a.x + b.x) / 2
          const my = (a.y + b.y) / 2
          const r = cellSize * 0.14
          return (
            <g key={i}>
              <circle cx={mx} cy={my} r={r} fill={getCurrentTheme().overlay.dotBackground} />
              <text x={mx} y={my} textAnchor="middle" dominantBaseline="central" fontSize={20} fontFamily={FONT_FAMILY} fontWeight="bold" fill={getCurrentTheme().overlay.dotText}>
                {pair.value}
              </text>
            </g>
          )
        })}
      </svg>
    )
  }

  private updateMetadata = () => {
    this.cellPairs = {}
    for (const pair of this.data.pairs) {
      const sum = pair.value === 'X' ? 10 : 5
      const k0 = `${pair.cells[0][0]},${pair.cells[0][1]}`
      const k1 = `${pair.cells[1][0]},${pair.cells[1][1]}`
      if (!(k0 in this.cellPairs)) this.cellPairs[k0] = []
      if (!(k1 in this.cellPairs)) this.cellPairs[k1] = []
      this.cellPairs[k0].push({ other: pair.cells[1], sum })
      this.cellPairs[k1].push({ other: pair.cells[0], sum })
    }
  }

  loadPuzzleData = (data: XVData) => {
    this.data = data
    this.updateMetadata()
  }
}
