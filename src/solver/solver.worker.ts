/// <reference lib="webworker" />
export {}

import type {
  SolverConstraint,
  SolverJob,
  WorkerInMessage,
  WorkerOutMessage,
} from './solverTypes'

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let stopRequested = false
let currentJobId = ''
let nodesExplored = 0
const PROGRESS_INTERVAL = 5000

// ---------------------------------------------------------------------------
// Bit helpers
// ---------------------------------------------------------------------------
function popcount(n: number): number {
  n = n - ((n >> 1) & 0x55555555)
  n = (n & 0x33333333) + ((n >> 2) & 0x33333333)
  return (((n + (n >> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24
}

function singletonBit(n: number): number {
  // Return the index of the single set bit (1-indexed digit). n must have exactly 1 bit set.
  let i = 1
  while (!(n & (1 << i))) i++
  return i
}

// ---------------------------------------------------------------------------
// Build per-cell constraint index for fast lookup
// ---------------------------------------------------------------------------
function buildCellConstraints(N: number, constraints: SolverConstraint[]): number[][] {
  const cc: number[][] = Array.from({ length: N }, () => [])
  for (let ci = 0; ci < constraints.length; ci++) {
    const con = constraints[ci]
    let cells: number[] = []
    switch (con.type) {
      case 'unique_group': cells = con.cells; break
      case 'thermo':       cells = con.cells; break
      case 'between':      cells = con.line; break
      case 'killer_cage':  cells = con.cells; break
      case 'arrow':
        cells = [...con.circle]
        for (const l of con.lines) cells.push(...l)
        break
      case 'renban':       cells = con.cells; break
      case 'whispers':
        for (const [a, b] of con.pairs) { cells.push(a); cells.push(b) }
        break
      case 'palindrome':
        for (const [a, b] of con.pairs) { cells.push(a); cells.push(b) }
        break
      case 'xv':           cells = [con.cell0, con.cell1]; break
      case 'difference':   cells = [con.cell0, con.cell1]; break
      case 'ratio':        cells = [con.cell0, con.cell1]; break
      case 'min_max':      cells = [con.cell, ...con.neighbors]; break
    }
    for (const c of cells) cc[c].push(ci)
  }
  return cc
}

// ---------------------------------------------------------------------------
// Propagate a single constraint after placing `digit` in `cell`.
// Mutates domains (and board for forced naked singles).
// Returns false on contradiction, pushes new forced assignments to queue.
// ---------------------------------------------------------------------------
function applyConstraintProp(
  board: Uint8Array,
  domains: Uint16Array,
  cell: number,
  digit: number,
  con: SolverConstraint,
  maxDigit: number,
  queue: Array<[number, number]>,
): boolean {
  // Helper: remove a single digit bit from a cell's domain.
  // Returns false on contradiction. Adds to queue if becomes singleton.
  function removeBit(c: number, bit: number): boolean {
    if (board[c] > 0) return true
    const nd = domains[c] & ~bit
    if (nd === 0) return false
    if (nd !== domains[c]) {
      domains[c] = nd
      if (popcount(nd) === 1) {
        const d = singletonBit(nd)
        board[c] = d
        queue.push([c, d])
      }
    }
    return true
  }

  // Helper: intersect a cell's domain with a bitmask.
  function intersect(c: number, mask: number): boolean {
    if (board[c] > 0) return true
    const nd = domains[c] & mask
    if (nd === 0) return false
    if (nd !== domains[c]) {
      domains[c] = nd
      if (popcount(nd) === 1) {
        const d = singletonBit(nd)
        board[c] = d
        queue.push([c, d])
      }
    }
    return true
  }

  const bit = 1 << digit

  switch (con.type) {
    case 'unique_group': {
      for (const other of con.cells) {
        if (other === cell) continue
        if (!removeBit(other, bit)) return false
      }
      break
    }

    case 'thermo': {
      const pos = con.cells.indexOf(cell)
      if (pos === -1) break
      // Predecessors must be < digit → remove >= digit
      for (let j = 0; j < pos; j++) {
        let mask = 0
        for (let d = 1; d < digit; d++) mask |= 1 << d
        if (!intersect(con.cells[j], mask)) return false
      }
      // Successors must be > digit → remove <= digit
      for (let j = pos + 1; j < con.cells.length; j++) {
        let mask = 0
        for (let d = digit + 1; d <= maxDigit; d++) mask |= 1 << d
        if (!intersect(con.cells[j], mask)) return false
      }
      break
    }

    case 'palindrome': {
      for (const [a, b] of con.pairs) {
        if (a === cell) {
          if (!intersect(b, bit)) return false
        } else if (b === cell) {
          if (!intersect(a, bit)) return false
        }
      }
      break
    }

    case 'xv': {
      const other = con.cell0 === cell ? con.cell1 : con.cell1 === cell ? con.cell0 : -1
      if (other === -1) break
      const required = con.total - digit
      if (required < 1 || required > maxDigit) return false
      if (!intersect(other, 1 << required)) return false
      break
    }

    case 'difference': {
      const other = con.cell0 === cell ? con.cell1 : con.cell1 === cell ? con.cell0 : -1
      if (other === -1) break
      let mask = 0
      const a = digit + con.diff; if (a >= 1 && a <= maxDigit) mask |= 1 << a
      const b = digit - con.diff; if (b >= 1 && b <= maxDigit) mask |= 1 << b
      if (mask === 0) return false
      if (!intersect(other, mask)) return false
      break
    }

    case 'ratio': {
      const other = con.cell0 === cell ? con.cell1 : con.cell1 === cell ? con.cell0 : -1
      if (other === -1) break
      let mask = 0
      const a = digit * con.ratio; if (Number.isInteger(a) && a >= 1 && a <= maxDigit) mask |= 1 << a
      const b = digit / con.ratio; if (Number.isInteger(b) && b >= 1 && b <= maxDigit) mask |= 1 << b
      if (mask === 0) return false
      if (!intersect(other, mask)) return false
      break
    }

    case 'whispers': {
      for (const [a, b] of con.pairs) {
        const other = a === cell ? b : b === cell ? a : -1
        if (other === -1) continue
        // Other cell must differ by >= 5: keep only values where |d - digit| >= 5
        let mask = 0
        for (let d = 1; d <= maxDigit; d++) {
          if (Math.abs(d - digit) >= 5) mask |= 1 << d
        }
        if (mask === 0) return false
        if (!intersect(other, mask)) return false
      }
      break
    }

    case 'min_max': {
      if (con.cell === cell) {
        // This is the min/max cell: constrain neighbors
        for (const n of con.neighbors) {
          let mask = 0
          if (con.isMax) {
            // Neighbors must be < digit
            for (let d = 1; d < digit; d++) mask |= 1 << d
          } else {
            // Neighbors must be > digit
            for (let d = digit + 1; d <= maxDigit; d++) mask |= 1 << d
          }
          if (mask === 0) return false
          if (!intersect(n, mask)) return false
        }
      } else if (con.neighbors.includes(cell)) {
        // This is a neighbor: constrain the min/max cell
        let mask = 0
        if (con.isMax) {
          // max cell must be > digit
          for (let d = digit + 1; d <= maxDigit; d++) mask |= 1 << d
        } else {
          // min cell must be < digit
          for (let d = 1; d < digit; d++) mask |= 1 << d
        }
        if (mask === 0) return false
        if (!intersect(con.cell, mask)) return false
      }
      break
    }

    case 'between': {
      const line = con.line
      const endA = line[0], endB = line[line.length - 1]
      const isEndA = endA === cell, isEndB = endB === cell
      if (!isEndA && !isEndB) break

      // If both endpoints are now known, constrain middles
      const valA = isEndA ? digit : board[endA]
      const valB = isEndB ? digit : board[endB]
      if (valA > 0 && valB > 0) {
        const lo = Math.min(valA, valB)
        const hi = Math.max(valA, valB)
        if (lo === hi) return false // endpoints equal → no valid middles
        let mask = 0
        for (let d = lo + 1; d < hi; d++) mask |= 1 << d
        if (mask === 0) return false
        for (let i = 1; i < line.length - 1; i++) {
          if (!intersect(line[i], mask)) return false
        }
      }
      break
    }

    case 'killer_cage': {
      // Propagate no-repeat within cage (unique_group-like)
      for (const other of con.cells) {
        if (other === cell) continue
        if (!removeBit(other, bit)) return false
      }
      break
    }

    case 'renban': {
      // No repeats
      for (const other of con.cells) {
        if (other === cell) continue
        if (!removeBit(other, bit)) return false
      }
      break
    }

    // arrow: too complex to propagate incrementally (check at completion)
  }

  return true
}

// ---------------------------------------------------------------------------
// Full propagation after placing digit in cell (with cascading naked singles)
// ---------------------------------------------------------------------------
function propagate(
  board: Uint8Array,
  domains: Uint16Array,
  cell: number,
  digit: number,
  constraints: SolverConstraint[],
  cellConstraints: number[][],
  maxDigit: number,
): boolean {
  const queue: Array<[number, number]> = [[cell, digit]]
  while (queue.length > 0) {
    const [c, d] = queue.pop()!
    for (const ci of cellConstraints[c]) {
      if (!applyConstraintProp(board, domains, c, d, constraints[ci], maxDigit, queue)) {
        return false
      }
    }
  }
  return true
}

// ---------------------------------------------------------------------------
// Completion checks for constraints not fully handled by propagation
// ---------------------------------------------------------------------------
function checkComplexConstraints(board: Uint8Array, constraints: SolverConstraint[]): boolean {
  for (const con of constraints) {
    switch (con.type) {
      case 'killer_cage': {
        if (con.total === undefined) break
        let sum = 0
        for (const c of con.cells) sum += board[c]
        if (sum !== con.total) return false
        break
      }

      case 'arrow': {
        // Circle value (possibly multi-cell for numbers >9, represented as digit string)
        let circleVal: number
        if (con.circle.length === 1) {
          circleVal = board[con.circle[0]]
        } else {
          circleVal = parseInt(con.circle.map((c) => board[c]).join(''))
        }
        let lineSum = 0
        for (const line of con.lines) {
          for (const c of line) lineSum += board[c]
        }
        if (circleVal !== lineSum) return false
        break
      }

      case 'renban': {
        let min = 99, max = 0
        for (const c of con.cells) {
          if (board[c] < min) min = board[c]
          if (board[c] > max) max = board[c]
        }
        if (max - min !== con.cells.length - 1) return false
        break
      }

      case 'between': {
        const line = con.line
        const valA = board[line[0]]
        const valB = board[line[line.length - 1]]
        const lo = Math.min(valA, valB)
        const hi = Math.max(valA, valB)
        for (let i = 1; i < line.length - 1; i++) {
          const m = board[line[i]]
          if (m <= lo || m >= hi) return false
        }
        break
      }
    }
  }
  return true
}

// ---------------------------------------------------------------------------
// Backtracking solver
// ---------------------------------------------------------------------------
function backtrack(
  board: Uint8Array,
  domains: Uint16Array,
  constraints: SolverConstraint[],
  cellConstraints: number[][],
  N: number,
  maxDigit: number,
): Uint8Array | null {
  if (stopRequested) return null

  nodesExplored++
  if (nodesExplored % PROGRESS_INTERVAL === 0) {
    const msg: WorkerOutMessage = { type: 'progress', jobId: currentJobId, nodes: nodesExplored }
    ;(self as unknown as DedicatedWorkerGlobalScope).postMessage(msg)
  }

  // Find MRV cell
  let best = -1
  let bestCount = maxDigit + 1
  for (let i = 0; i < N; i++) {
    if (board[i] > 0) continue
    const count = popcount(domains[i])
    if (count === 0) return null
    if (count < bestCount) {
      bestCount = count
      best = i
      if (count === 1) break
    }
  }

  if (best === -1) {
    // All cells filled — run completion checks
    return checkComplexConstraints(board, constraints) ? board : null
  }

  const domainBits = domains[best]
  for (let d = 1; d <= maxDigit; d++) {
    if (!(domainBits & (1 << d))) continue

    const newBoard = board.slice() as Uint8Array
    const newDomains = domains.slice() as Uint16Array
    newBoard[best] = d
    newDomains[best] = 1 << d

    if (propagate(newBoard, newDomains, best, d, constraints, cellConstraints, maxDigit)) {
      const result = backtrack(newBoard, newDomains, constraints, cellConstraints, N, maxDigit)
      if (result) return result
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// Entry point: solve a job
// ---------------------------------------------------------------------------
function solveJob(job: SolverJob): number[] | null {
  const { rows, cols, maxDigit, constraints } = job
  const N = rows * cols

  const board = new Uint8Array(job.board)
  const domains = new Uint16Array(N)
  const allBits = ((1 << (maxDigit + 1)) - 1) & ~1 // bits 1..maxDigit

  for (let i = 0; i < N; i++) {
    domains[i] = board[i] > 0 ? 1 << board[i] : allBits
  }

  const cellConstraints = buildCellConstraints(N, constraints)

  // Propagate all fixed cells
  for (let i = 0; i < N; i++) {
    if (board[i] > 0) {
      if (!propagate(board, domains, i, board[i], constraints, cellConstraints, maxDigit)) {
        return null
      }
    }
  }

  const result = backtrack(board, domains, constraints, cellConstraints, N, maxDigit)
  return result ? Array.from(result) : null
}

// ---------------------------------------------------------------------------
// Worker message handler
// ---------------------------------------------------------------------------
;(self as unknown as DedicatedWorkerGlobalScope).onmessage = (
  e: MessageEvent<WorkerInMessage>,
) => {
  const msg = e.data
  if (msg.type === 'stop') {
    stopRequested = true
    return
  }
  if (msg.type === 'solve') {
    stopRequested = false
    nodesExplored = 0
    currentJobId = msg.job.jobId

    const result = solveJob(msg.job)
    const out: WorkerOutMessage = result
      ? { type: 'solution', jobId: msg.job.jobId, board: result }
      : { type: 'no_solution', jobId: msg.job.jobId }
    ;(self as unknown as DedicatedWorkerGlobalScope).postMessage(out)
  }
}
