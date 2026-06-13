import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useGameStore } from '../stores/gameStore'
import { useNetworkStore } from '../stores/networkStore'
import { loadPuzzle } from '../puzzle/import'
import { saveSession, restoreSession, clearSession } from '../stores/persistence'

// persistence.ts guards on `window` and uses a bare `localStorage` global, which
// do not exist in the node test environment. Provide minimal stubs.
function installStorageStubs() {
  const store = new Map<string, string>()
  const fake = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  }
  ;(globalThis as any).window = globalThis
  ;(globalThis as any).localStorage = fake
}

function makePuzzle(size = 9): any {
  return {
    metadata: { title: 'Persistence Puzzle', source: 'internal' },
    grid: {
      size,
      // One given so we can distinguish puzzle givens from player entries.
      cells: Array.from({ length: size }, (_, r) =>
        Array.from({ length: size }, (_, c) =>
          r === 0 && c === 0 ? { given: 5 } : {},
        ),
      ),
    },
    constraints: [],
  }
}

describe('session persistence', () => {
  beforeEach(() => {
    installStorageStubs()
    localStorage.clear()
    useNetworkStore.setState({ currentPuzzle: null, clients: new Map(), host: null })
    useGameStore.getState().initializeBoard(9, 9)
  })

  afterEach(() => {
    clearSession()
    delete (globalThis as any).window
    delete (globalThis as any).localStorage
  })

  it('round-trips an in-progress puzzle through save -> reset -> restore', () => {
    // Host loads a puzzle (also sets networkStore.currentPuzzle via loadPuzzle).
    loadPuzzle(makePuzzle())
    // Player makes a move.
    useGameStore.getState().dispatch((draft) => {
      draft.boardState[4][4].number = 7
    }, 'me')

    saveSession()

    // Simulate a page refresh: wipe in-memory state back to a blank board.
    useNetworkStore.setState({ currentPuzzle: null })
    useGameStore.getState().initializeBoard(9, 9)
    expect(useGameStore.getState().gameState.boardState[4][4].number).toBeNull()

    const restored = restoreSession()
    expect(restored).toBe(true)
    // Player's in-progress entry survives.
    expect(useGameStore.getState().gameState.boardState[4][4].number).toBe(7)
    // The puzzle's given survives too.
    expect(useGameStore.getState().gameState.boardState[0][0].number).toBe(5)
    expect(useGameStore.getState().gameState.boardState[0][0].fixed).toBe(true)
    // currentPuzzle is repopulated so multiplayer transmission works post-refresh.
    expect(useNetworkStore.getState().currentPuzzle).not.toBeNull()
  })

  it('returns false when there is no saved session', () => {
    localStorage.clear()
    expect(restoreSession()).toBe(false)
  })

  it('restores a puzzleless board (free-play progress)', () => {
    useGameStore.getState().dispatch((draft) => {
      draft.boardState[1][1].number = 3
    }, 'me')
    saveSession()

    useGameStore.getState().initializeBoard(9, 9)
    expect(restoreSession()).toBe(true)
    expect(useGameStore.getState().gameState.boardState[1][1].number).toBe(3)
  })
})
