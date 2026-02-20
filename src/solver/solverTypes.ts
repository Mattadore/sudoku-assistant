// ---------------------------------------------------------------------------
// Constraint types for the solver worker.
// All cell indices are flat: row * cols + col.
// ---------------------------------------------------------------------------

export type SolverConstraint =
  | { type: 'unique_group'; cells: number[] }
  | { type: 'thermo'; cells: number[] }
  // first and last cells are endpoints; remainder are middles
  | { type: 'between'; line: number[] }
  | { type: 'killer_cage'; cells: number[]; total?: number }
  | { type: 'arrow'; circle: number[]; lines: number[][] }
  | { type: 'renban'; cells: number[] }
  | { type: 'whispers'; pairs: [number, number][] }
  | { type: 'palindrome'; pairs: [number, number][] }
  | { type: 'xv'; cell0: number; cell1: number; total: number }
  | { type: 'difference'; cell0: number; cell1: number; diff: number }
  | { type: 'ratio'; cell0: number; cell1: number; ratio: number }
  | { type: 'min_max'; cell: number; neighbors: number[]; isMax: boolean }

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
