import { useGameStore } from './gameStore'
import { useNetworkStore } from './networkStore'
import { loadPuzzle } from '../puzzle/import'

// Bumped if the saved shape changes incompatibly.
const STORAGE_KEY = 'sudoku-session-v1'

type SavedSession = {
  // The puzzle definition is the only reliable way to rebuild the non-serializable
  // derived state (grid config, solver extensions/constraints) after a reload.
  puzzle: PuzzleDefinition | null
  // The in-progress board (givens + the player's entries). Plain JSON.
  boardState: BoardState
}

/**
 * Persist the current in-progress session to localStorage.
 *
 * We deliberately save only the serializable INPUTS — the puzzle definition and
 * the board state — not the derived state. Solver extensions are class instances
 * and cannot be JSON-serialized; they are rebuilt from the puzzle definition on
 * restore. Mirrors what the multiplayer host->client handoff sends.
 */
export function saveSession(): void {
  if (typeof window === 'undefined') return
  try {
    const payload: SavedSession = {
      puzzle: useNetworkStore.getState().currentPuzzle,
      boardState: useGameStore.getState().gameState.boardState,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // Quota exceeded or serialization failure — persistence is best-effort and
    // must never break gameplay. Skip this write.
  }
}

/** Remove any saved session (e.g. an explicit "new game"/reset). */
export function clearSession(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* non-fatal */
  }
}

/**
 * Restore a saved session if one exists. Returns true if a session was restored.
 *
 * When a puzzle definition was saved we replay loadPuzzle() to rebuild the grid
 * config and extensions, then overlay the saved in-progress board (preserving
 * grid + extensions). This is the same two-step the network client uses on join.
 */
export function restoreSession(): boolean {
  if (typeof window === 'undefined') return false

  let raw: string | null = null
  try {
    raw = localStorage.getItem(STORAGE_KEY)
  } catch {
    return false
  }
  if (!raw) return false

  let saved: SavedSession
  try {
    saved = JSON.parse(raw)
  } catch {
    return false
  }
  if (!saved || !Array.isArray(saved.boardState) || saved.boardState.length === 0) {
    return false
  }

  if (saved.puzzle) {
    loadPuzzle(saved.puzzle)
    const gridConfig = useGameStore.getState().gameState.gridConfig
    useGameStore.getState().loadFullState(saved.boardState, gridConfig)
  } else {
    useGameStore.getState().loadFullState(saved.boardState)
  }
  return true
}

/**
 * Subscribe to board changes and persist on every mutation. Returns an
 * unsubscribe function. Board writes are small (<= a few KB) so an unthrottled
 * write per change is cheap and keeps the saved state exactly current.
 */
export function subscribePersistence(): () => void {
  return useGameStore.subscribe((state, prev) => {
    if (state.gameState !== prev.gameState) saveSession()
  })
}
