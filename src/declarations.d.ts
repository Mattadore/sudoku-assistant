// Constraint types used by the solver worker (mirrored in src/solver/solverTypes.ts)
// Cell indices are flat: row * cols + col
type SolverConstraint =
  | { type: 'unique_group'; cells: number[] }
  | { type: 'thermo'; cells: number[] }
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

// like Partial<> but recursive
type Diff<T> = {
  [P in keyof T]?: Diff<T[P]>
}

interface AnnotationData {
  numbers: Array<number>
  letters: Array<string>
}

interface CellData {
  number: number | null
  center: AnnotationData
  topLeftCorner: AnnotationData
  bottomRightCorner: AnnotationData
  color: string[]
  fixed: boolean
}

type BoardIndex = [row: number, column: number]
type BoardIndexExtension = [row: number, column: number, extension: string]

type AnnotationLocation =
  | 'center'
  | 'topLeftCorner'
  | 'bottomRightCorner'
  | 'number'

interface Userdata {
  selectorIndex: string | null
  selectedIndices: string[]
  color: string
}

interface ConflictData {
  // Map of cells that depend on the value of this cell to which numbers those cells care about
  dependencies: { [extension: string]: { [index: string]: number[] } }
  // List of numbers that conflict to the board indices they conflict with, guaranteed to size of board
  conflicts: BoardIndexExtension[][]
}

type ConflictMatrix = ConflictData[][]

type CellDiff = Diff<CellData>

type BoardState = CellData[][]

interface SolverExtension {
  extensionName: string
  // Array of [row, col, conflict1, conflict2...] — omit for display-only extensions
  getCellConflicts?: (board: BoardState, index: BoardIndex) => number[][]
  // Does this extension actually care about this index?
  isRelevant?: (index: BoardIndex) => boolean
  // SVG/React element rendered inside a GridCell
  getCellDecoration?: (board: BoardState, row: number, column: number) => any
  // SVG/React content rendered UNDER grid lines but above cell backgrounds (clipped to cell bounds)
  getBoardUnderlay?: (board: BoardState, cellSize: number) => any
  // SVG/React element rendered as a board-level overlay (within the grid area)
  getBoardOverlay?: (board: BoardState, cellSize: number) => any
  // SVG/React element rendered in the outer clue area (one cell width outside the grid)
  getOuterOverlay?: (board: BoardState, cellSize: number) => any
  settings?: {
    disableDefaultValidation?: boolean
  }
  // Load constraint data from internal PuzzleDefinition format
  loadPuzzleData?: (data: any) => void
  // Legacy fpuzzles loader (used until full import pipeline is ready)
  loadFpuzzleData?: (data: any) => void
  // React elements to render in the sidebar Extensions section
  getSidebarControls?: () => any
  // Serialize this extension's constraints for the solver worker
  serializeConstraints?: (rows: number, cols: number) => SolverConstraint[]
}

// FPuzzles format types (from f-puzzles.com)
interface FPuzzleCell {
  value?: number
  given?: boolean
  c?: string
  region?: number
  centerPencilMarks?: number[]
  givenPencilMarks?: number[]
}

interface FPuzzleLineConstraint {
  lines: string[][]
}

interface FPuzzleKillerCage {
  cells: string[]
  value?: string
}

interface FPuzzleData {
  size: number
  title?: string
  author?: string
  ruleset?: string
  grid: FPuzzleCell[][]
  solution?: number[][]
  antiknight?: boolean
  antiking?: boolean
  disjointgroups?: boolean
  nonconsecutive?: boolean
  'diagonal+'?: boolean
  'diagonal-'?: boolean
  thermometer?: FPuzzleLineConstraint[]
  palindrome?: FPuzzleLineConstraint[]
  renban?: FPuzzleLineConstraint[]
  whispers?: FPuzzleLineConstraint[]
  betweenline?: FPuzzleLineConstraint[]
  killercage?: FPuzzleKillerCage[]
  [key: string]: any
}

// Generic puzzle format importer — implement to add support for a new format
interface PuzzleFormat {
  name: string
  /** Return true if this format can handle the given raw input string. */
  detect(input: string): boolean
  /** Parse the raw input and return an internal PuzzleDefinition. */
  decode(input: string): PuzzleDefinition
}

// Internal puzzle format
interface PuzzleCell {
  given?: number
  color?: string
}

interface PuzzleConstraint {
  type: string
  data?: any
}

interface PuzzleDefinition {
  metadata: {
    title?: string
    author?: string
    ruleset?: string
    source?: 'fpuzzles' | 'ctc' | 'penpa' | 'internal'
    sourceUrl?: string
    /** Built-in solution from the puzzle source, if provided (flat: row*size+col) */
    solution?: number[]
  }
  settings?: {
    /** Whether conflict highlighting is enabled for this puzzle. Defaults to true. */
    conflictsEnabled?: boolean
  }
  grid: {
    size: number
    regions?: number[][]
    cells: PuzzleCell[][]
  }
  constraints: PuzzleConstraint[]
}
