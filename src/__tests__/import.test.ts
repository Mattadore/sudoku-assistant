import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from '../stores/gameStore'
import { useExtensionStore } from '../stores/extensionStore'
import { convertFPuzzleToPuzzle, loadPuzzle } from '../puzzle/import'
import Sudoku from '../solver-extensions/Sudoku'

// FPuzzleData with actual given cells
const givensFpuzzle: FPuzzleData = {
  size: 9,
  title: 'Test Givens',
  grid: Array.from({ length: 9 }, (_, r) =>
    Array.from({ length: 9 }, (_, c) => {
      // Place a few known givens
      if (r === 0 && c === 0) return { given: true, value: 5 }
      if (r === 4 && c === 4) return { given: true, value: 9 }
      if (r === 8 && c === 8) return { given: true, value: 3 }
      return {}
    }),
  ),
}

// Minimal FPuzzleData with thermometers
const thermoFpuzzle: FPuzzleData = {
  size: 9,
  title: 'Test Thermo',
  grid: Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => ({})),
  ),
  thermometer: [
    { lines: [['R1C2', 'R2C2', 'R3C2', 'R4C1', 'R5C1']] },
    { lines: [['R5C2', 'R6C1', 'R7C1']] },
  ],
}

// Minimal FPuzzleData with killer cages
const killerFpuzzle: FPuzzleData = {
  size: 9,
  title: 'Test Killer',
  grid: Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => ({})),
  ),
  killercage: [
    { cells: ['R1C1', 'R1C2', 'R2C1'], value: '10' },
  ],
}

describe('import pipeline', () => {
  beforeEach(() => {
    useGameStore.getState().initializeBoard(9, 9)
    useExtensionStore.getState().initialize(
      useGameStore.getState().gameState.boardState,
      [new Sudoku()],
    )
  })

  it('given cells appear in boardState after loadPuzzle', () => {
    const puzzle = convertFPuzzleToPuzzle(givensFpuzzle)
    loadPuzzle(puzzle)

    const board = useGameStore.getState().gameState.boardState
    expect(board[0][0].number).toBe(5)
    expect(board[0][0].fixed).toBe(true)
    expect(board[4][4].number).toBe(9)
    expect(board[4][4].fixed).toBe(true)
    expect(board[8][8].number).toBe(3)
    expect(board[8][8].fixed).toBe(true)
    // Empty cell should stay null
    expect(board[0][1].number).toBeNull()
    expect(board[0][1].fixed).toBe(false)
  })

  it('boardState cell objects are replaced (not mutated) after loadPuzzle', () => {
    // Capture a reference to a cell BEFORE loading
    const cellBefore = useGameStore.getState().gameState.boardState[0][0]

    const puzzle = convertFPuzzleToPuzzle(givensFpuzzle)
    loadPuzzle(puzzle)

    const cellAfter = useGameStore.getState().gameState.boardState[0][0]
    // The cell object must be a NEW reference so Zustand selectors re-render
    expect(cellAfter).not.toBe(cellBefore)
    expect(cellAfter.number).toBe(5)
  })

  it('converts thermometer fpuzzle to PuzzleDefinition', () => {
    const puzzle = convertFPuzzleToPuzzle(thermoFpuzzle)
    expect(puzzle.constraints.length).toBe(2) // sudoku + thermometer
    const thermoConstraint = puzzle.constraints.find(
      (c) => c.type === 'thermometer',
    )
    expect(thermoConstraint).toBeDefined()
    expect(thermoConstraint!.data.lines.length).toBe(2)
    // First thermo: R1C2 = [0,1], R2C2 = [1,1], etc.
    expect(thermoConstraint!.data.lines[0][0]).toEqual([0, 1])
    expect(thermoConstraint!.data.lines[0][1]).toEqual([1, 1])
  })

  it('loads thermometer puzzle with extensions', () => {
    const puzzle = convertFPuzzleToPuzzle(thermoFpuzzle)
    loadPuzzle(puzzle)

    const extensions = useExtensionStore.getState().extensions
    expect(Object.keys(extensions)).toContain('thermometer')
    const thermo = extensions['thermometer'] as any
    expect(thermo.data.length).toBe(2)
    // Extension should have getBoardUnderlay
    expect(thermo.getBoardUnderlay).toBeDefined()
  })

  it('thermometer extension has getBoardUnderlay defined', () => {
    const puzzle = convertFPuzzleToPuzzle(thermoFpuzzle)
    loadPuzzle(puzzle)

    const extensions = useExtensionStore.getState().extensions
    const thermo = extensions['thermometer']
    expect(thermo.getBoardUnderlay).toBeDefined()
  })

  it('converts killer cage fpuzzle', () => {
    const puzzle = convertFPuzzleToPuzzle(killerFpuzzle)
    const cageConstraint = puzzle.constraints.find(
      (c) => c.type === 'killercage',
    )
    expect(cageConstraint).toBeDefined()
    expect(cageConstraint!.data.cages[0].cells[0]).toEqual([0, 0])
    expect(cageConstraint!.data.cages[0].total).toBe(10)
  })

  it('loads killer cage extension with data', () => {
    const puzzle = convertFPuzzleToPuzzle(killerFpuzzle)
    loadPuzzle(puzzle)

    const extensions = useExtensionStore.getState().extensions
    expect(Object.keys(extensions)).toContain('killercage')
    const cage = extensions['killercage'] as any
    expect(cage.data.cages.length).toBe(1)
    expect(cage.data.cages[0].total).toBe(10)
    expect(cage.getBoardOverlay).toBeDefined()
  })
})
