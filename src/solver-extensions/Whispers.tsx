import { cellCenter, gridViewBox, overlayStyle } from './svgHelpers'
import { getCurrentTheme } from '../themes'
import type { ConstraintHandler } from '../solver/solverTypes'

export const solverHandler: ConstraintHandler = {
  cellsOf: (con) => {
    const seen = new Set<number>()
    for (const [a, b] of con.pairs as [number, number][]) { seen.add(a); seen.add(b) }
    return [...seen]
  },
  propagate: (cell, digit, con, maxDigit, _board, _domains, _removeBit, intersect) => {
    for (const [a, b] of con.pairs as [number, number][]) {
      const other = a === cell ? b : b === cell ? a : -1
      if (other === -1) continue
      let mask = 0
      for (let d = 1; d <= maxDigit; d++) {
        if (Math.abs(d - digit) >= 5) mask |= 1 << d
      }
      if (mask === 0) return false
      if (!intersect(other, mask)) return false
    }
    return true
  },
}

type LineData = { lines: BoardIndex[][] }

export default class Whispers implements SolverExtension {
  extensionName = 'whispers'
  data: BoardIndex[][] = []
  // Maps cell -> list of adjacent cells on whisper lines
  private cellNeighbors: { [index: string]: string[] } = {}

  isRelevant = (index: BoardIndex): boolean => {
    return `${index[0]},${index[1]}` in this.cellNeighbors
  }

  getCellConflicts = (board: BoardState, index: BoardIndex): number[][] => {
    const num = board[index[0]][index[1]].number
    if (!num) return []
    const key = `${index[0]},${index[1]}`
    const neighbors = this.cellNeighbors[key]
    if (!neighbors) return []
    const conflicts: number[][] = []
    // Adjacent cells on whisper line must differ by >= 5
    // So they conflict on numbers within 4 of num
    const badNums: number[] = []
    for (let n = 1; n <= 9; n++) {
      if (Math.abs(n - num) < 5) badNums.push(n)
    }
    for (const nKey of neighbors) {
      const [r, c] = nKey.split(',').map(Number)
      conflicts.push([r, c, ...badNums])
    }
    return conflicts
  }

  serializeConstraints = (_rows: number, cols: number): SolverConstraint[] => {
    const pairs: [number, number][] = []
    for (const line of this.data) {
      for (let i = 0; i + 1 < line.length; i++) {
        pairs.push([line[i][0] * cols + line[i][1], line[i + 1][0] * cols + line[i + 1][1]])
      }
    }
    return pairs.length > 0 ? [{ type: 'whispers', pairs }] : []
  }

  getBoardOverlay = (_board: BoardState, cellSize: number): any => {
    if (this.data.length === 0) return null
    const cc = (r: number, c: number) => cellCenter(r, c, cellSize)
    const lineWidth = cellSize * 0.2
    return (
      <svg style={overlayStyle()} viewBox={gridViewBox(cellSize, _board.length, _board[0].length)}>
        {this.data.map((line, i) => {
          const points = line.map(([r, c]) => { const p = cc(r, c); return `${p.x},${p.y}` }).join(' ')
          return <polyline key={i} points={points} fill="none" stroke={getCurrentTheme().overlay.whispers} strokeWidth={lineWidth} strokeLinecap="round" strokeLinejoin="round" opacity={0.5} />
        })}
      </svg>
    )
  }

  private updateMetadata = () => {
    this.cellNeighbors = {}
    for (const line of this.data) {
      for (let i = 0; i < line.length; i++) {
        const key = `${line[i][0]},${line[i][1]}`
        if (!(key in this.cellNeighbors)) this.cellNeighbors[key] = []
        if (i > 0) this.cellNeighbors[key].push(`${line[i - 1][0]},${line[i - 1][1]}`)
        if (i < line.length - 1) this.cellNeighbors[key].push(`${line[i + 1][0]},${line[i + 1][1]}`)
      }
    }
  }

  loadPuzzleData = (data: LineData) => {
    this.data = data.lines
    this.updateMetadata()
  }
}
