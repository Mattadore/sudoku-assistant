declare const graphql: (query: TemplateStringsArray) => void

// like Partial<> but recursive
type Diff<T> = {
  [P in keyof T]?: Diff<T[P]>
}

interface CellData {
  number: number | null
  center: Array<number>
  corner: Array<number>
  color: string | null
}

interface Userdata {
  selectorIndex: string | null
  selectedIndices: string[]
  color: string
}

type CellDiff = Diff<CellData>

type BoardState = CellData[][]

type ConflictList = { [key: string]: true }

type BoardIndex = [row: number, column: number]

interface SolverExtension {
  extensionName: string
  getBoardConflicts?: (board: BoardState) => ConflictList
  getCellConflict: (board: BoardState, row: number, column: number) => boolean
  // iterates over every cell of every list and draws them
  drawCell?: (board: BoardState, listIndex: number, cellIndex: number) => any
  draw?: (board: BoardState) => void
  settings?: {
    disableDefaultValidation?: boolean
    // What % of the board needs to have changed to bypass incremental update and do a full recalc
    bypassIncrementalDiffPercent?: number
  }
  loadFpuzzleData?: (data: any) => void
}

interface SolverExtensionCellData {
  
}
