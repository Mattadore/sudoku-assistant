import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from '../stores/gameStore'
import { useExtensionStore } from '../stores/extensionStore'
import { useUIStore } from '../stores/uiStore'
import Sudoku from '../solver-extensions/Sudoku'

describe('conflict highlight', () => {
  beforeEach(() => {
    useGameStore.getState().initializeBoard(9, 9)
    useExtensionStore.getState().initialize(
      useGameStore.getState().gameState.boardState,
      [new Sudoku()],
    )
    useUIStore.getState().setConflictHighlights([])
  })

  it('no highlights when no cell is selected', () => {
    expect(useUIStore.getState().conflictHighlightSet.size).toBe(0)
  })

  it('computes conflict highlights for a cell with number', () => {
    // Place two 5s in the same row
    useGameStore.getState().dispatch((draft) => {
      draft.boardState[0][0].number = 5
    }, 'user1')
    useGameStore.getState().dispatch((draft) => {
      draft.boardState[0][4].number = 5
    }, 'user1')

    // Simulate selecting cell [0,0] — read its conflict data
    const conflictData = useExtensionStore.getState().conflictMatrix[0][0]
    const conflicting = conflictData.conflicts[5 - 1] // number 5
    const indices = conflicting
      .map(([r, c]) => `${r},${c}`)
      .filter((idx) => idx !== '0,0')
    useUIStore.getState().setConflictHighlights(indices)

    // Cell [0,4] should be highlighted (same row, same number)
    expect(useUIStore.getState().conflictHighlightSet.has('0,4')).toBe(true)
    // Cell [0,0] itself should NOT be in the highlight set
    expect(useUIStore.getState().conflictHighlightSet.has('0,0')).toBe(false)
  })

  it('clearing highlights works', () => {
    useUIStore.getState().setConflictHighlights(['0,1', '0,2', '0,3'])
    expect(useUIStore.getState().conflictHighlightSet.size).toBe(3)

    useUIStore.getState().setConflictHighlights([])
    expect(useUIStore.getState().conflictHighlightSet.size).toBe(0)
  })

  it('highlights include cells in row, column, and box that have the same number', () => {
    // Place 7 in multiple locations that conflict with [4,4]
    useGameStore.getState().dispatch((draft) => {
      draft.boardState[4][4].number = 7
      draft.boardState[4][0].number = 7  // same row
      draft.boardState[0][4].number = 7  // same column
      draft.boardState[3][3].number = 7  // same box
    }, 'user1')

    const conflictData = useExtensionStore.getState().conflictMatrix[4][4]
    const conflicting = conflictData.conflicts[7 - 1]
    const indices = conflicting
      .map(([r, c]) => `${r},${c}`)
      .filter((idx) => idx !== '4,4')
    useUIStore.getState().setConflictHighlights(indices)

    // All three conflicting cells should be highlighted
    expect(useUIStore.getState().conflictHighlightSet.has('4,0')).toBe(true)
    expect(useUIStore.getState().conflictHighlightSet.has('0,4')).toBe(true)
    expect(useUIStore.getState().conflictHighlightSet.has('3,3')).toBe(true)
    // Non-conflicting cells should NOT be highlighted
    expect(useUIStore.getState().conflictHighlightSet.has('8,8')).toBe(false)
  })
})
