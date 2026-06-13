/// <reference lib="webworker" />
export {}

import type {
  SolverConstraint,
  SolverJob,
  WorkerInMessage,
  WorkerOutMessage,
} from './solverTypes'
import { constraintHandlers } from './constraintHandlers'

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
    const handler = constraintHandlers[constraints[ci].type]
    if (!handler) continue
    for (const c of handler.cellsOf(constraints[ci], N)) {
      if (c >= 0 && c < N) cc[c].push(ci)
    }
  }
  return cc
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

  // Helpers close over board, domains, queue — passed to each constraint handler.
  function removeBit(c: number, bit: number): boolean {
    if (board[c] > 0) return (domains[c] & ~bit) !== 0
    const nd = domains[c] & ~bit
    if (nd === 0) return false
    if (nd !== domains[c]) {
      domains[c] = nd
      if (popcount(nd) === 1) { board[c] = singletonBit(nd); queue.push([c, board[c]]) }
    }
    return true
  }

  function intersect(c: number, mask: number): boolean {
    if (board[c] > 0) return (domains[c] & mask) !== 0
    const nd = domains[c] & mask
    if (nd === 0) return false
    if (nd !== domains[c]) {
      domains[c] = nd
      if (popcount(nd) === 1) { board[c] = singletonBit(nd); queue.push([c, board[c]]) }
    }
    return true
  }

  while (queue.length > 0) {
    const [c, d] = queue.pop()!
    for (const ci of cellConstraints[c]) {
      const con = constraints[ci]
      const handler = constraintHandlers[con.type]
      if (!handler) continue
      if (!handler.propagate(c, d, con, maxDigit, board, domains, removeBit, intersect)) {
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
  for (const con of constraints as any[]) {
    switch (con.type) {
      case 'killer_cage': {
        if (con.total === undefined) break
        let sum = 0
        for (const c of con.cells) sum += board[c]
        if (sum !== con.total) return false
        break
      }

      case 'arrow': {
        let circleVal: number
        if (con.circle.length === 1) {
          circleVal = board[con.circle[0]]
        } else {
          circleVal = parseInt(con.circle.map((c: number) => board[c]).join(''))
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
    const msg: WorkerOutMessage = { type: 'progress', jobId: currentJobId, nodes: PROGRESS_INTERVAL }
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
  const { rows, cols, maxDigit } = job
  const constraints = job.constraints as any[]
  const N = rows * cols

  const board = new Uint8Array(job.board)
  const domains = new Uint16Array(N)
  const allBits = ((1 << (maxDigit + 1)) - 1) & ~1 // bits 1..maxDigit

  for (let i = 0; i < N; i++) {
    domains[i] = board[i] > 0 ? 1 << board[i] : allBits
  }

  const cellConstraints = buildCellConstraints(N, constraints)

  // Initialize domain constraints (e.g., parity) before any propagation.
  for (const con of constraints) {
    const handler = constraintHandlers[con.type]
    if (handler?.initialize) {
      if (!handler.initialize(con, N, board, domains, maxDigit)) return null
    }
  }

  // Pre-solve: prune killer cage domains before any backtracking begins.
  // This handles cages with no fixed cells yet — purely sum+size reasoning.
  for (const con of constraints) {
    if (con.type !== 'killer_cage' || con.total === undefined) continue
    let placedSum = 0, usedBits = 0
    const emptyCells: number[] = []
    for (const c of con.cells) {
      if (board[c] > 0) { placedSum += board[c]; usedBits |= 1 << board[c] }
      else emptyCells.push(c)
    }
    const remaining = con.total - placedSum
    const k = emptyCells.length
    if (k === 0) { if (remaining !== 0) return null; continue }
    const availBits = allBits & ~usedBits
    const avail: number[] = []
    for (let d = 1; d <= maxDigit; d++) if (availBits & (1 << d)) avail.push(d)
    if (avail.length < k) return null
    let minSum = 0, maxSum = 0
    for (let i = 0; i < k; i++) minSum += avail[i]
    for (let i = avail.length - k; i < avail.length; i++) maxSum += avail[i]
    if (remaining < minSum || remaining > maxSum) return null
    for (const c of emptyCells) {
      let newMask = 0
      for (let d = 1; d <= maxDigit; d++) {
        if (!(domains[c] & (1 << d))) continue
        if (!(availBits & (1 << d))) continue
        const need = remaining - d
        let lo = 0, hi = 0, cnt = 0
        for (let i = 0; i < avail.length && cnt < k - 1; i++) {
          if (avail[i] !== d) { lo += avail[i]; cnt++ }
        }
        if (cnt < k - 1) continue
        cnt = 0
        for (let i = avail.length - 1; i >= 0 && cnt < k - 1; i--) {
          if (avail[i] !== d) { hi += avail[i]; cnt++ }
        }
        if (need >= lo && need <= hi) newMask |= 1 << d
      }
      if (newMask === 0) return null
      const nd = domains[c] & newMask
      if (nd === 0) return null
      if (nd !== domains[c]) {
        domains[c] = nd
        if (popcount(nd) === 1) {
          const forcedDigit = singletonBit(nd)
          board[c] = forcedDigit
          if (!propagate(board, domains, c, forcedDigit, constraints, cellConstraints, maxDigit)) return null
        }
      }
    }
  }

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
