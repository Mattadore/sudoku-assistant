import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from '../stores/gameStore'
import { useExtensionStore } from '../stores/extensionStore'
import Sudoku from '../solver-extensions/Sudoku'

describe('gameStore', () => {
  beforeEach(() => {
    useGameStore.getState().initializeBoard(9, 9)
    useExtensionStore.getState().initialize(
      useGameStore.getState().gameState.boardState,
      [new Sudoku()],
    )
  })

  it('initializes a 9x9 board with empty cells', () => {
    const { boardState } = useGameStore.getState().gameState
    expect(boardState.length).toBe(9)
    expect(boardState[0].length).toBe(9)
    expect(boardState[0][0].number).toBe(null)
  })

  it('dispatch sets a cell number and returns patches', () => {
    const patches = useGameStore.getState().dispatch((draft) => {
      draft.boardState[0][0].number = 5
    }, 'user1')
    expect(patches.length).toBeGreaterThan(0)
    expect(useGameStore.getState().gameState.boardState[0][0].number).toBe(5)
  })

  it('dispatch with no changes returns empty patches', () => {
    const patches = useGameStore.getState().dispatch((draft) => {
      // no-op
    }, 'user1')
    expect(patches.length).toBe(0)
  })

  it('undo reverts the last action for a user', () => {
    useGameStore.getState().dispatch((draft) => {
      draft.boardState[0][0].number = 5
    }, 'user1')
    expect(useGameStore.getState().gameState.boardState[0][0].number).toBe(5)

    useGameStore.getState().undo('user1')
    expect(useGameStore.getState().gameState.boardState[0][0].number).toBe(null)
  })

  it('redo restores the undone action', () => {
    useGameStore.getState().dispatch((draft) => {
      draft.boardState[0][0].number = 5
    }, 'user1')
    useGameStore.getState().undo('user1')
    expect(useGameStore.getState().gameState.boardState[0][0].number).toBe(null)

    useGameStore.getState().redo('user1')
    expect(useGameStore.getState().gameState.boardState[0][0].number).toBe(5)
  })

  it('undo only affects the specified user', () => {
    useGameStore.getState().dispatch((draft) => {
      draft.boardState[0][0].number = 5
    }, 'user1')
    useGameStore.getState().dispatch((draft) => {
      draft.boardState[1][1].number = 3
    }, 'user2')

    useGameStore.getState().undo('user1')
    // user1's action undone
    expect(useGameStore.getState().gameState.boardState[0][0].number).toBe(null)
    // user2's action preserved
    expect(useGameStore.getState().gameState.boardState[1][1].number).toBe(3)
  })

  it('new action clears redo stack', () => {
    useGameStore.getState().dispatch((draft) => {
      draft.boardState[0][0].number = 5
    }, 'user1')
    useGameStore.getState().undo('user1')
    expect(useGameStore.getState().canRedo('user1')).toBe(true)

    // New action should clear redo
    useGameStore.getState().dispatch((draft) => {
      draft.boardState[2][2].number = 7
    }, 'user1')
    expect(useGameStore.getState().canRedo('user1')).toBe(false)
  })

  it('loadFullState replaces state and resets history', () => {
    useGameStore.getState().dispatch((draft) => {
      draft.boardState[0][0].number = 5
    }, 'user1')
    expect(useGameStore.getState().history.length).toBe(1)

    const newBoard = useGameStore.getState().gameState.boardState
    useGameStore.getState().loadFullState(newBoard)
    expect(useGameStore.getState().history.length).toBe(0)
    expect(useGameStore.getState().gameState.boardState[0][0].number).toBe(5)
  })

  it('applyRemotePatches applies patches and records history', () => {
    // Generate patches from a dispatch
    const patches = useGameStore.getState().dispatch((draft) => {
      draft.boardState[3][3].number = 9
    }, 'user1')

    // Reset and apply remotely
    useGameStore.getState().initializeBoard(9, 9)
    useGameStore.getState().applyRemotePatches(patches, 'remote-user')

    expect(useGameStore.getState().gameState.boardState[3][3].number).toBe(9)
    expect(useGameStore.getState().history.length).toBe(1)
    expect(useGameStore.getState().history[0].userId).toBe('remote-user')
  })
})
