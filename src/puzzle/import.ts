import { compressor } from 'external'
import { useGameStore } from '../stores/gameStore'
import { useExtensionStore } from '../stores/extensionStore'
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
}

function parseFPuzzleCell(ref: string): BoardIndex {
  const match = ref.match(/R(\d+)C(\d+)/)
  if (!match) throw new Error(`Invalid cell reference: ${ref}`)
  return [parseInt(match[1]) - 1, parseInt(match[2]) - 1]
}

export function convertFPuzzleToPuzzle(fpuzzle: FPuzzleData): PuzzleDefinition {
  const size = fpuzzle.size
  const cells: PuzzleCell[][] = []
  for (let row = 0; row < size; row++) {
    cells.push([])
    for (let col = 0; col < size; col++) {
      const fpCell = fpuzzle.grid[row]?.[col]
      const cell: PuzzleCell = {}
      if (fpCell?.given && fpCell?.value) cell.given = fpCell.value
      if (fpCell?.c) cell.color = fpCell.c
      cells[row].push(cell)
    }
  }

  const constraints: PuzzleConstraint[] = [{ type: 'sudoku' }]

  // Thermometers
  if (fpuzzle.thermometer?.length) {
    constraints.push({
      type: 'thermometer',
      data: { lines: fpuzzle.thermometer.map((t) => t.lines[0].map(parseFPuzzleCell)) },
    })
  }

  // Killer cages
  if (fpuzzle.killercage?.length) {
    constraints.push({
      type: 'killercage',
      data: {
        cages: fpuzzle.killercage.map((cage) => ({
          cells: cage.cells.map(parseFPuzzleCell),
          total: cage.value ? parseInt(cage.value) : undefined,
        })),
      },
    })
  }

  // Arrow
  if (fpuzzle.arrow?.length) {
    constraints.push({
      type: 'arrow',
      data: {
        arrows: fpuzzle.arrow.map((a: any) => ({
          circle: (a.cells || []).map(parseFPuzzleCell),
          line: (a.lines || []).map((line: string[]) => line.map(parseFPuzzleCell)),
        })),
      },
    })
  }

  // Boolean constraints
  if (fpuzzle.antiknight) constraints.push({ type: 'antiknight' })
  if (fpuzzle.antiking) constraints.push({ type: 'antiking' })
  if (fpuzzle['diagonal+']) constraints.push({ type: 'diagonal+' })
  if (fpuzzle['diagonal-']) constraints.push({ type: 'diagonal-' })
  if (fpuzzle.nonconsecutive) constraints.push({ type: 'nonconsecutive' })
  if (fpuzzle.disjointgroups) constraints.push({ type: 'disjointgroups' })

  // Line-based constraints
  const lineTypes = ['palindrome', 'renban', 'whispers', 'betweenline'] as const
  for (const type of lineTypes) {
    const lineData = fpuzzle[type] as FPuzzleLineConstraint[] | undefined
    if (lineData?.length) {
      constraints.push({
        type,
        data: { lines: lineData.map((c) => c.lines[0].map(parseFPuzzleCell)) },
      })
    }
  }

  // Border constraints (difference, ratio, xv)
  if (fpuzzle.difference?.length) {
    constraints.push({
      type: 'difference',
      data: {
        pairs: fpuzzle.difference.map((d: any) => ({
          cells: d.cells.map(parseFPuzzleCell) as [BoardIndex, BoardIndex],
          value: d.value ? parseInt(d.value) : undefined,
        })),
      },
    })
  }
  if (fpuzzle.ratio?.length) {
    constraints.push({
      type: 'ratio',
      data: {
        pairs: fpuzzle.ratio.map((r: any) => ({
          cells: r.cells.map(parseFPuzzleCell) as [BoardIndex, BoardIndex],
          value: r.value ? parseInt(r.value) : undefined,
        })),
      },
    })
  }
  if (fpuzzle.xv?.length) {
    constraints.push({
      type: 'xv',
      data: {
        pairs: fpuzzle.xv.map((x: any) => ({
          cells: x.cells.map(parseFPuzzleCell) as [BoardIndex, BoardIndex],
          value: x.value || 'X',
        })),
      },
    })
  }

  // Cell markers (odd, even, min, max)
  for (const type of ['odd', 'even', 'minimum', 'maximum'] as const) {
    const markers = fpuzzle[type] as { cell: string }[] | undefined
    if (markers?.length) {
      constraints.push({
        type,
        data: { cells: markers.map((m) => parseFPuzzleCell(m.cell)) },
      })
    }
  }

  // Custom regions
  let regions: number[][] | undefined
  if (fpuzzle.grid.some((row) => row.some((cell) => cell.region !== undefined))) {
    regions = fpuzzle.grid.map((row) => row.map((cell) => cell.region ?? 0))
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

export function decodeFPuzzle(input: string): FPuzzleData {
  let base64 = input
  if (input.includes('?load=')) base64 = input.split('?load=')[1]
  const json = compressor.decompressFromBase64(base64)
  console.log(json)
  if (!json) throw new Error('Failed to decompress puzzle data')
  return JSON.parse(json) as FPuzzleData
}

export function loadPuzzle(puzzle: PuzzleDefinition) {
  const { size, cells } = puzzle.grid
  const gameStore = useGameStore.getState()
  const extensionStore = useExtensionStore.getState()

  gameStore.initializeBoard(size, size)
  const boardState = useGameStore.getState().gameState.boardState

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const puzzleCell = cells[row]?.[col]
      if (puzzleCell?.given) {
        boardState[row][col].number = puzzleCell.given
        boardState[row][col].fixed = true
      }
      if (puzzleCell?.color) boardState[row][col].color = [puzzleCell.color]
    }
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
  gameStore.loadFullState(boardState)
}

export function importFPuzzle(input: string) {
  const fpuzzleData = decodeFPuzzle(input)
  const puzzle = convertFPuzzleToPuzzle(fpuzzleData)
  loadPuzzle(puzzle)
  return puzzle
}
