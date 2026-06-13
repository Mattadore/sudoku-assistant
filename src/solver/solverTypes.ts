// ---------------------------------------------------------------------------
// Constraint types for the solver worker.
// All cell indices are flat: row * cols + col.
// ---------------------------------------------------------------------------

export type SolverConstraint = { type: string } & Record<string, unknown>

/**
 * A constraint handler plugs into the solver worker's propagation engine.
 * Extensions export one of these so that solver.worker.ts never needs to know
 * about specific constraint types.
 */
export type ConstraintHandler = {
  /** Flat cell indices that should reference this constraint in the lookup table. */
  cellsOf(con: any, N: number): number[]
  /**
   * Called when `digit` is placed in `cell`. Narrow other cells' domains via
   * `removeBit` / `intersect`. Return false on contradiction.
   */
  propagate(
    cell: number,
    digit: number,
    con: any,
    maxDigit: number,
    board: Uint8Array,
    domains: Uint16Array,
    removeBit: (c: number, bit: number) => boolean,
    intersect: (c: number, mask: number) => boolean,
  ): boolean
  /**
   * Optional. Called once per constraint after domains are initialized but
   * before any propagation or backtracking. Use this for constraints that
   * restrict a cell's own domain rather than propagating between cells
   * (e.g., parity). Return false if the constraint is immediately violated.
   */
  initialize?(con: any, N: number, board: Uint8Array, domains: Uint16Array, maxDigit: number): boolean
}

export type SolverJob = {
  jobId: string
  /** Flat board: 0 = empty, 1-9 = digit */
  board: number[]
  rows: number
  cols: number
  maxDigit: number
  constraints: SolverConstraint[]
  /** Flat solution provided by the puzzle (e.g. from f-puzzles), if any */
  knownSolution?: number[]
}

export type WorkerInMessage =
  | { type: 'solve'; job: SolverJob }
  | { type: 'stop' }

export type WorkerOutMessage =
  | { type: 'solution'; jobId: string; board: number[] }
  | { type: 'no_solution'; jobId: string }
  | { type: 'progress'; jobId: string; nodes: number }
