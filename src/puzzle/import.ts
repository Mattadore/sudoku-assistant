import { compressor } from 'external'
import { useGameStore } from '../stores/gameStore'
import { useExtensionStore } from '../stores/extensionStore'
import Sudoku from '../solver-extensions/Sudoku'
import Thermometer from '../solver-extensions/Thermometer'

// Registry of extension constructors by constraint type
const extensionConstructors: { [type: string]: () => SolverExtension } = {
  sudoku: () => new Sudoku(),
  thermometer: () => new Thermometer(),
}

// Convert FPuzzles "R1C1" (1-indexed) to BoardIndex [0, 0] (0-indexed)
function parseFPuzzleCell(ref: string): BoardIndex {
  const match = ref.match(/R(\d+)C(\d+)/)
  if (!match) throw new Error(`Invalid cell reference: ${ref}`)
  return [parseInt(match[1]) - 1, parseInt(match[2]) - 1]
}

// Convert FPuzzleData to internal PuzzleDefinition
export function convertFPuzzleToPuzzle(fpuzzle: FPuzzleData): PuzzleDefinition {
  const size = fpuzzle.size

  // Convert grid cells (givens, colors)
  const cells: PuzzleCell[][] = []
  for (let row = 0; row < size; row++) {
    cells.push([])
    for (let col = 0; col < size; col++) {
      const fpCell = fpuzzle.grid[row]?.[col]
      const cell: PuzzleCell = {}
      if (fpCell?.given && fpCell?.value) {
        cell.given = fpCell.value
      }
      if (fpCell?.c) {
        cell.color = fpCell.c
      }
      cells[row].push(cell)
    }
  }

  // Build constraints list
  const constraints: PuzzleConstraint[] = [{ type: 'sudoku' }]

  // Thermometers
  if (fpuzzle.thermometer && fpuzzle.thermometer.length > 0) {
    const lines: BoardIndex[][] = fpuzzle.thermometer.map((thermo) =>
      thermo.lines[0].map(parseFPuzzleCell),
    )
    constraints.push({ type: 'thermometer', data: { lines } })
  }

  // Killer cages
  if (fpuzzle.killercage && fpuzzle.killercage.length > 0) {
    const cages = fpuzzle.killercage.map((cage) => ({
      cells: cage.cells.map(parseFPuzzleCell),
      total: cage.value ? parseInt(cage.value) : undefined,
    }))
    constraints.push({ type: 'killercage', data: { cages } })
  }

  // Boolean constraints
  if (fpuzzle.antiknight) constraints.push({ type: 'antiknight' })
  if (fpuzzle.antiking) constraints.push({ type: 'antiking' })
  if (fpuzzle['diagonal+']) constraints.push({ type: 'diagonal+' })
  if (fpuzzle['diagonal-']) constraints.push({ type: 'diagonal-' })
  if (fpuzzle.nonconsecutive) constraints.push({ type: 'nonconsecutive' })
  if (fpuzzle.disjointgroups) constraints.push({ type: 'disjointgroups' })

  // Line-based constraints
  const lineTypes = [
    'palindrome',
    'renban',
    'whispers',
    'betweenline',
  ] as const
  for (const type of lineTypes) {
    const lineData = fpuzzle[type] as FPuzzleLineConstraint[] | undefined
    if (lineData && lineData.length > 0) {
      const lines: BoardIndex[][] = lineData.map((constraint) =>
        constraint.lines[0].map(parseFPuzzleCell),
      )
      constraints.push({ type, data: { lines } })
    }
  }

  // Custom regions
  let regions: number[][] | undefined
  if (fpuzzle.grid.some((row) => row.some((cell) => cell.region !== undefined))) {
    regions = fpuzzle.grid.map((row) =>
      row.map((cell) => cell.region ?? 0),
    )
  }

  return {
    metadata: {
      title: fpuzzle.title,
      author: fpuzzle.author,
      ruleset: fpuzzle.ruleset,
      source: 'fpuzzles',
    },
    grid: { size, cells, regions },
    constraints,
  }
}

// Decode an FPuzzles URL or base64 string into FPuzzleData
export function decodeFPuzzle(input: string): FPuzzleData {
  // Extract base64 from URL if needed
  let base64 = input
  if (input.includes('?load=')) {
    base64 = input.split('?load=')[1]
  }

  const json = compressor.decompressFromBase64(base64)
  if (!json) throw new Error('Failed to decompress puzzle data')

  return JSON.parse(json) as FPuzzleData
}

// Load a PuzzleDefinition into the game state and extension store
export function loadPuzzle(puzzle: PuzzleDefinition) {
  const { size, cells } = puzzle.grid
  const gameStore = useGameStore.getState()
  const extensionStore = useExtensionStore.getState()

  // Initialize board with givens and colors
  gameStore.initializeBoard(size, size)
  const boardState = useGameStore.getState().gameState.boardState

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const puzzleCell = cells[row]?.[col]
      if (puzzleCell?.given) {
        boardState[row][col].number = puzzleCell.given
      }
      if (puzzleCell?.color) {
        boardState[row][col].color = puzzleCell.color
      }
    }
  }

  // Create and configure extensions from constraints
  const extensions: SolverExtension[] = []
  for (const constraint of puzzle.constraints) {
    const constructor = extensionConstructors[constraint.type]
    if (!constructor) continue

    const ext = constructor()

    // Feed constraint data to the extension
    if (constraint.data && ext.loadPuzzleData) {
      ext.loadPuzzleData(constraint.data)
    }

    extensions.push(ext)
  }

  // Initialize extension store with the configured extensions
  extensionStore.initialize(boardState, extensions)

  // Load full state (triggers conflict computation for all cells)
  gameStore.loadFullState(boardState)
}

// Full pipeline: FPuzzles URL/base64 -> loaded game
export function importFPuzzle(input: string) {
  const fpuzzleData = decodeFPuzzle(input)
  const puzzle = convertFPuzzleToPuzzle(fpuzzleData)
  loadPuzzle(puzzle)
  return puzzle
}
