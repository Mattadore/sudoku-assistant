declare const graphql: (query: TemplateStringsArray) => void

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
  color: string | null
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

// interface ConflictData {
//   // Map of cells that depend on the value of this cell to which numbers those cells care about
//   dependencies: Map<BoardIndex, number[]>
//   // List of numbers that conflict to the boardindices they conflict with, guaranteed to size of board
//   conflicts: BoardIndex[][]
// }

interface ConflictData {
  // Map of cells that depend on the value of this cell to which numbers those cells care about
  dependencies: { [extension: string]: { [index: string]: number[] } }
  // List of numbers that conflict to the boardindices they conflict with, guaranteed to size of board
  conflicts: BoardIndexExtension[][]
}

type ConflictMatrix = ConflictData[][]

type CellDiff = Diff<CellData>

type BoardState = CellData[][]

type ConflictList = { [key: string]: true }

interface SolverExtension {
  extensionName: string
  // Array of [row, col, conflict1, conflict2...]
  getCellConflicts: (board: BoardState, index: BoardIndex) => number[][]
  // iterates over every cell of every list and draws them
  isRelevant: (index: BoardIndex) => boolean
  drawCell?: (board: BoardState, listIndex: number, cellIndex: number) => any
  draw?: (board: BoardState) => void
  settings?: {
    disableDefaultValidation?: boolean
    // What % of the board needs to have changed to bypass incremental update and do a full recalc
    bypassIncrementalDiffPercent?: number
  }
  loadFpuzzleData?: (data: any) => void
}

interface SolverExtensionCellData {}
