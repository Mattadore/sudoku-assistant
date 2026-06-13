import { cellCenter, gridViewBox, overlayStyle } from './svgHelpers'
import { FONT_FAMILY } from '../theme'
import { getCurrentTheme } from '../themes'
import type { ConstraintHandler } from '../solver/solverTypes'

type CageData = { cages: { cells: BoardIndex[]; total?: number }[] }

export const solverHandler: ConstraintHandler = {
  cellsOf: (con) => con.cells,

  propagate: (cell, digit, con, maxDigit, board, domains, removeBit, intersect) => {
    // Step 1: uniqueness — no other cell in the cage can hold this digit.
    const bit = 1 << digit
    for (const other of con.cells as number[]) {
      if (other === cell) continue
      if (!removeBit(other, bit)) return false
    }

    // No total to enforce — uniqueness is all we need.
    if (con.total === undefined) return true

    // Step 2: sum propagation — narrow each empty cell's domain using the
    // remaining sum budget and which digits are still available.

    // Tally what's already placed in the cage.
    let placedSum = 0, usedBits = 0
    const emptyCells: number[] = []
    for (const c of con.cells as number[]) {
      if (board[c] > 0) { placedSum += board[c]; usedBits |= 1 << board[c] }
      else emptyCells.push(c)
    }

    const remaining = (con.total as number) - placedSum
    const k = emptyCells.length

    // All cells placed: sum must be exact.
    if (k === 0) return remaining === 0

    // One cell left: it must equal the remaining sum exactly.
    if (k === 1) {
      if (remaining < 1 || remaining > maxDigit) return false
      return intersect(emptyCells[0], 1 << remaining)
    }

    // Build the sorted list of digits still available to the cage
    // (digits not yet placed in any cage cell).
    const availBits = (((1 << (maxDigit + 1)) - 1) & ~1) & ~usedBits
    const avail: number[] = []
    for (let d = 1; d <= maxDigit; d++) { if (availBits & (1 << d)) avail.push(d) }
    if (avail.length < k) return false

    // Quick feasibility check: can k distinct available digits sum to `remaining`?
    // minSum uses the k smallest available; maxSum uses the k largest.
    let minSum = 0, maxSum = 0
    for (let i = 0; i < k; i++) minSum += avail[i]
    for (let i = avail.length - k; i < avail.length; i++) maxSum += avail[i]
    if (remaining < minSum || remaining > maxSum) return false

    // Per-cell pruning: for each digit d that could go in cell c, check whether
    // the remaining k-1 cells can still reach (remaining - d) using other
    // available digits. We do this by computing the min/max achievable sum of
    // k-1 digits from avail, excluding d.
    for (const c of emptyCells) {
      let newMask = 0
      for (let d = 1; d <= maxDigit; d++) {
        if (!(domains[c] & (1 << d))) continue   // d not in this cell's domain
        if (!(availBits & (1 << d))) continue     // d already used elsewhere in cage

        const need = (remaining as number) - d    // what the other k-1 cells must sum to

        // Minimum sum of k-1 values from avail excluding d (take smallest k-1).
        let lo = 0, cnt = 0
        for (let i = 0; i < avail.length && cnt < k - 1; i++) {
          if (avail[i] !== d) { lo += avail[i]; cnt++ }
        }
        if (cnt < k - 1) continue  // not enough other digits available

        // Maximum sum of k-1 values from avail excluding d (take largest k-1).
        let hi = 0
        cnt = 0
        for (let i = avail.length - 1; i >= 0 && cnt < k - 1; i--) {
          if (avail[i] !== d) { hi += avail[i]; cnt++ }
        }

        // d is viable only if the rest can achieve the needed sum.
        if (need >= lo && need <= hi) newMask |= 1 << d
      }
      if (newMask === 0) return false
      if (!intersect(c, newMask)) return false
    }
    return true
  },
}

export default class KillerCage implements SolverExtension {
  extensionName = 'killercage'
  data: CageData = { cages: [] }
  private cellCages: { [index: string]: number[] } = {}

  isRelevant = (index: BoardIndex): boolean => {
    return `${index[0]},${index[1]}` in this.cellCages
  }

  getCellConflicts = (board: BoardState, index: BoardIndex): number[][] => {
    const num = board[index[0]][index[1]].number
    if (!num) return []
    const key = `${index[0]},${index[1]}`
    const cageIndices = this.cellCages[key]
    if (!cageIndices) return []
    const conflicts: number[][] = []

    for (const ci of cageIndices) {
      const cage = this.data.cages[ci]
      const cellNums: { r: number; c: number; n: number }[] = []
      let allFilled = true

      for (const [r, c] of cage.cells) {
        const n = board[r][c].number
        if (!n) {
          allFilled = false
        } else {
          cellNums.push({ r, c, n })
        }
      }

      // No-repeat rule: always enforced (even if cage isn't full)
      for (const { r, c, n } of cellNums) {
        if (r === index[0] && c === index[1]) continue
        if (n === num) {
          // Duplicate found — both cells conflict on this number
          conflicts.push([r, c, num])
        }
      }

      // Sum rule (only when the cage has a target total):
      //   - cage full but sum !== total → wrong, all cells conflict
      //   - cage not yet full but the filled cells already exceed the total →
      //     impossible to complete (digits are positive), so they conflict now
      // Checking the partial overshoot makes the highlight depend only on the
      // current board, never on the order cells were filled or cleared.
      if (cage.total !== undefined) {
        const sum = cellNums.reduce((acc, { n }) => acc + n, 0)
        const wrongWhenFull = allFilled && sum !== cage.total
        const exceeded = sum > cage.total
        if (wrongWhenFull || exceeded) {
          // All filled cells (including self) conflict on their numbers
          for (const { r, c, n } of cellNums) {
            conflicts.push([r, c, n])
          }
        }
      }
    }
    return conflicts
  }

  serializeConstraints = (_rows: number, cols: number): SolverConstraint[] => {
    return this.data.cages.map((cage) => ({
      type: 'killer_cage' as const,
      cells: cage.cells.map(([r, c]) => r * cols + c),
      total: cage.total,
    }))
  }

  getBoardOverlay = (_board: BoardState, cellSize: number): any => {
    if (this.data.cages.length === 0) return null
    const inset = 3.5

    // Compute the top-left corner of a cell's inset box
    const cellTopLeft = (row: number, col: number) => {
      const center = cellCenter(row, col, cellSize)
      return {
        x: center.x - cellSize / 2 + inset,
        y: center.y - cellSize / 2 + inset,
      }
    }

    const cellBottomRight = (row: number, col: number) => {
      const tl = cellTopLeft(row, col)
      return { x: tl.x + cellSize - 2 * inset, y: tl.y + cellSize - 2 * inset }
    }

    return (
      <svg
        style={overlayStyle()}
        viewBox={gridViewBox(cellSize, _board.length, _board[0].length)}
      >
        {this.data.cages.map((cage, ci) => {
          const cellSet = new Set(cage.cells.map(([r, c]) => `${r},${c}`))
          const segments: { x1: number; y1: number; x2: number; y2: number }[] =
            []
          for (const [r, c] of cage.cells) {
            const tl = cellTopLeft(r, c)
            const br = cellBottomRight(r, c)
            if (!cellSet.has(`${r - 1},${c}`))
              segments.push({ x1: tl.x, y1: tl.y, x2: br.x, y2: tl.y })
            if (!cellSet.has(`${r + 1},${c}`))
              segments.push({ x1: tl.x, y1: br.y, x2: br.x, y2: br.y })
            if (!cellSet.has(`${r},${c - 1}`))
              segments.push({ x1: tl.x, y1: tl.y, x2: tl.x, y2: br.y })
            if (!cellSet.has(`${r},${c + 1}`))
              segments.push({ x1: br.x, y1: tl.y, x2: br.x, y2: br.y })
          }
          const firstTl = cellTopLeft(cage.cells[0][0], cage.cells[0][1])
          return (
            <g key={ci}>
              {segments.map((s, si) => {
                // Compute segment length and a dash pattern that tiles evenly
                const len = Math.abs(s.x2 - s.x1) + Math.abs(s.y2 - s.y1)
                const targetDash = 6
                const targetGap = 3
                const unit = targetDash + targetGap
                // Round to nearest whole number of dash+gap units
                const count = Math.max(1, Math.round(len / unit))
                const actualUnit = len / count
                const dash = actualUnit * (targetDash / unit)
                const gap = actualUnit * (targetGap / unit)
                return (
                  <line
                    key={si}
                    x1={s.x1}
                    y1={s.y1}
                    x2={s.x2}
                    y2={s.y2}
                    stroke={getCurrentTheme().overlay.cage}
                    strokeWidth={1.2}
                    strokeDasharray={`${dash} ${gap}`}
                  />
                )
              })}
              {cage.total !== undefined && (
                <text
                  x={firstTl.x + 4}
                  y={firstTl.y + 13}
                  fontSize={13}
                  fontFamily={FONT_FAMILY}
                  fontWeight="bold"
                  fill={getCurrentTheme().overlay.cage}
                >
                  {cage.total}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    )
  }

  private updateMetadata = () => {
    this.cellCages = {}
    for (let ci = 0; ci < this.data.cages.length; ci++) {
      for (const [r, c] of this.data.cages[ci].cells) {
        const key = `${r},${c}`
        if (!(key in this.cellCages)) this.cellCages[key] = []
        this.cellCages[key].push(ci)
      }
    }
  }

  loadPuzzleData = (data: CageData) => {
    this.data = data
    this.updateMetadata()
  }
}
