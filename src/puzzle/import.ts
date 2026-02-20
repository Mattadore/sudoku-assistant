import { useGameStore, computeDefaultRegions } from '../stores/gameStore'
import { useExtensionStore } from '../stores/extensionStore'
import { useUIStore } from '../stores/uiStore'
import Sudoku from '../solver-extensions/Sudoku'
import Thermometer from '../solver-extensions/Thermometer'
import KillerCage from '../solver-extensions/KillerCage'
import Arrow from '../solver-extensions/Arrow'
import Diagonal from '../solver-extensions/Diagonal'
import AntiKnight from '../solver-extensions/AntiKnight'
import AntiKing from '../solver-extensions/AntiKing'
import NonConsecutive from '../solver-extensions/NonConsecutive'
import DisjointGroups from '../solver-extensions/DisjointGroups'
import OddEven from '../solver-extensions/OddEven'
import MinMax from '../solver-extensions/MinMax'
import Palindrome from '../solver-extensions/Palindrome'
import Renban from '../solver-extensions/Renban'
import Whispers from '../solver-extensions/Whispers'
import BetweenLine from '../solver-extensions/BetweenLine'
import Difference from '../solver-extensions/Difference'
import Ratio from '../solver-extensions/Ratio'
import XV from '../solver-extensions/XV'
import Cosmetics from '../solver-extensions/Cosmetics'
import { fpuzzlesFormat, convertFPuzzleToPuzzle, decodeFPuzzle } from './fpuzzles'
import { ctcFormat } from './ctc'

const extensionConstructors: { [type: string]: () => SolverExtension } = {
  sudoku: () => new Sudoku(),
  thermometer: () => new Thermometer(),
  killercage: () => new KillerCage(),
  arrow: () => new Arrow(),
  'diagonal+': () => new Diagonal('positive'),
  'diagonal-': () => new Diagonal('negative'),
  antiknight: () => new AntiKnight(),
  antiking: () => new AntiKing(),
  nonconsecutive: () => new NonConsecutive(),
  disjointgroups: () => new DisjointGroups(),
  odd: () => new OddEven('odd'),
  even: () => new OddEven('even'),
  minimum: () => new MinMax('minimum'),
  maximum: () => new MinMax('maximum'),
  palindrome: () => new Palindrome(),
  renban: () => new Renban(),
  whispers: () => new Whispers(),
  betweenline: () => new BetweenLine(),
  difference: () => new Difference(),
  ratio: () => new Ratio(),
  xv: () => new XV(),
  cosmetics: () => new Cosmetics(),
}

export function loadPuzzle(puzzle: PuzzleDefinition) {
  const { size, cells, regions } = puzzle.grid
  const extensionStore = useExtensionStore.getState()

  // Build fresh board state with given cells — avoids mutating existing cell
  // objects in place, which would not trigger Zustand selector re-renders.
  const boardState: BoardState = []
  for (let row = 0; row < size; row++) {
    boardState.push([])
    for (let col = 0; col < size; col++) {
      const puzzleCell = cells[row]?.[col]
      boardState[row].push({
        number: puzzleCell?.given ?? null,
        fixed: !!puzzleCell?.given,
        color: puzzleCell?.color ? [puzzleCell.color] : [],
        center: { numbers: [], letters: [] },
        topLeftCorner: { numbers: [], letters: [] },
        bottomRightCorner: { numbers: [], letters: [] },
      })
    }
  }

  const gridConfig = {
    rows: size,
    cols: size,
    regions: regions ?? computeDefaultRegions(size, size),
  }

  const extensions: SolverExtension[] = []
  for (const constraint of puzzle.constraints) {
    const constructor = extensionConstructors[constraint.type]
    if (!constructor) continue
    const ext = constructor()
    if (constraint.data && ext.loadPuzzleData) ext.loadPuzzleData(constraint.data)
    extensions.push(ext)
  }

  extensionStore.initialize(boardState, extensions)
  useGameStore.getState().loadFullState(boardState, gridConfig)

  // Store known solution if provided by the puzzle
  if (puzzle.metadata.solution && puzzle.metadata.solution.length === size * size) {
    useGameStore.getState().setKnownSolution(puzzle.metadata.solution)
  }

  // Apply puzzle-level settings then reset the timer
  const ui = useUIStore.getState()
  ui.setConflictsEnabled(puzzle.settings?.conflictsEnabled ?? true)
  ui.resetTimer()
  ui.startTimer()
}

/**
 * Ordered list of registered puzzle format importers.
 * Formats are tried in order; the first one whose detect() returns true wins.
 * Add new formats here as they are implemented.
 */
const formats: PuzzleFormat[] = [ctcFormat, fpuzzlesFormat]

/**
 * Register a new puzzle format importer. Registered formats are tried before
 * built-in ones, so third-party formats can take precedence.
 */
export function registerFormat(format: PuzzleFormat) {
  formats.unshift(format)
}

/**
 * Import a puzzle from any supported format. Auto-detects the format from the
 * input string, converts to the internal PuzzleDefinition, loads it into the
 * game state, and returns the definition (e.g. for displaying metadata).
 *
 * Supported inputs:
 *   - f-puzzles.com URL or bare base64 string (LZ-string encoded)
 *   - SudokuPad URL: https://sudokupad.app/ctc<data> or .../scl<data>
 *   - Prefixed CTC string: ctc<data> or scl<data>
 *   - Raw CTC JSON object
 */
export function importPuzzle(input: string): PuzzleDefinition {
  const s = input.trim()
  const decodeErrors: string[] = []

  for (const fmt of formats) {
    if (!fmt.detect(s)) continue
    try {
      const puzzle = fmt.decode(s)
      loadPuzzle(puzzle)
      return puzzle
    } catch (e: any) {
      // This format detected the input but failed to decode; try the next one
      decodeErrors.push(`${fmt.name}: ${e?.message ?? 'unknown error'}`)
    }
  }

  if (decodeErrors.length > 0) {
    throw new Error(`Failed to import puzzle:\n${decodeErrors.join('\n')}`)
  }
  throw new Error(
    'Unrecognized puzzle format. Paste an f-puzzles URL/base64 or a SudokuPad URL (sudokupad.app/ctc…).',
  )
}

// Re-export FPuzzles helpers for backward compatibility (tests import these)
export { convertFPuzzleToPuzzle, decodeFPuzzle }

/** @deprecated Use importPuzzle() instead */
export function importFPuzzle(input: string): PuzzleDefinition {
  return importPuzzle(input)
}
