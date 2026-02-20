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
  // Array of [row, col, conflict1, conflict2...]
  getCellConflicts: (board: BoardState, index: BoardIndex) => number[][]
  // Does this extension actually care about this index?
  isRelevant?: (index: BoardIndex) => boolean
  // SVG/React element rendered inside a GridCell
  getCellDecoration?: (board: BoardState, row: number, column: number) => any
  // SVG/React element rendered as a board-level overlay
  getBoardOverlay?: (board: BoardState, cellSize: number) => any
  settings?: {
    disableDefaultValidation?: boolean
  }
  // Load constraint data from internal PuzzleDefinition format
  loadPuzzleData?: (data: any) => void
  // Legacy fpuzzles loader (used until full import pipeline is ready)
  loadFpuzzleData?: (data: any) => void
  // React elements to render in the sidebar Extensions section
  getSidebarControls?: () => any
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
  }
  grid: {
    size: number
    regions?: number[][]
    cells: PuzzleCell[][]
  }
  constraints: PuzzleConstraint[]
}
