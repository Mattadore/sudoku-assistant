import { create } from 'zustand'
import { produceWithPatches, applyPatches, enablePatches, Patch } from 'immer'
import { useExtensionStore } from './extensionStore'

enablePatches()

export interface GameState {
  boardState: BoardState
}

export interface HistoryEntry {
  patches: Patch[]
  inversePatches: Patch[]
  userId: string
}

interface GameStore {
  gameState: GameState
  history: HistoryEntry[]
  undoStacks: Map<string, HistoryEntry[]>
  initialState: GameState

  dispatch: (mutator: (draft: GameState) => void, userId: string) => Patch[]
  undo: (userId: string) => void
  redo: (userId: string) => void
  canUndo: (userId: string) => boolean
  canRedo: (userId: string) => boolean
  applyRemotePatches: (patches: Patch[], userId: string) => void
  loadFullState: (boardState: BoardState) => void
  initializeBoard: (rows: number, cols: number) => void
}

function extractChangedCells(patches: Patch[]): string[] {
  const indices = new Set<string>()
  for (const patch of patches) {
    // Path format: ['boardState', row, col, ...]
    if (
      patch.path[0] === 'boardState' &&
      patch.path.length >= 3 &&
      typeof patch.path[1] === 'number' &&
      typeof patch.path[2] === 'number'
    ) {
      indices.add(`${patch.path[1]},${patch.path[2]}`)
    }
  }
  return Array.from(indices)
}

function createEmptyBoard(rows: number, cols: number): BoardState {
  const board: BoardState = []
  for (let row = 0; row < rows; ++row) {
    board.push([])
    for (let col = 0; col < cols; ++col) {
      board[row].push({
        number: null,
        center: { numbers: [], letters: [] },
        topLeftCorner: { numbers: [], letters: [] },
        bottomRightCorner: { numbers: [], letters: [] },
        color: [],
        fixed: false,
      })
    }
  }
  return board
}

const emptyState: GameState = { boardState: createEmptyBoard(9, 9) }

export const useGameStore = create<GameStore>()((set, get) => ({
  gameState: emptyState,
  history: [],
  undoStacks: new Map(),
  initialState: emptyState,

  initializeBoard: (rows, cols) => {
    const boardState = createEmptyBoard(rows, cols)
    const gameState = { boardState }
    set({
      gameState,
      initialState: gameState,
      history: [],
      undoStacks: new Map(),
    })
  },

  dispatch: (mutator, userId) => {
    const { gameState, history } = get()

    const [nextState, patches, inversePatches] = produceWithPatches(
      gameState,
      mutator,
    )

    if (patches.length === 0) return []

    const newHistory = [...history, { patches, inversePatches, userId }]

    // Clear this user's redo stack on new action
    const newUndoStacks = new Map(get().undoStacks)
    newUndoStacks.delete(userId)

    // Update conflicts for changed cells
    const changedIndices = extractChangedCells(patches)
    if (changedIndices.length > 0) {
      useExtensionStore
        .getState()
        .updateConflicts(nextState.boardState, changedIndices)
    }

    set({
      gameState: nextState,
      history: newHistory,
      undoStacks: newUndoStacks,
    })

    return patches
  },

  undo: (userId) => {
    const { history, initialState, undoStacks } = get()

    // Find user's most recent action in history
    let lastActionIndex = -1
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].userId === userId) {
        lastActionIndex = i
        break
      }
    }

    if (lastActionIndex === -1) return

    // Remove this entry and push to user's redo stack
    const newHistory = [...history]
    const [removed] = newHistory.splice(lastActionIndex, 1)

    const newUndoStacks = new Map(undoStacks)
    const userStack = newUndoStacks.get(userId) || []
    newUndoStacks.set(userId, [...userStack, removed])

    // Rebuild state by replaying all remaining patches
    let rebuiltState = initialState
    for (const entry of newHistory) {
      rebuiltState = applyPatches(rebuiltState, entry.patches)
    }

    // Update all conflicts
    const allIndices: string[] = []
    for (let row = 0; row < rebuiltState.boardState.length; row++) {
      for (let col = 0; col < rebuiltState.boardState[0].length; col++) {
        allIndices.push(`${row},${col}`)
      }
    }
    useExtensionStore
      .getState()
      .updateConflicts(rebuiltState.boardState, allIndices)

    set({
      gameState: rebuiltState,
      history: newHistory,
      undoStacks: newUndoStacks,
    })
  },

  redo: (userId) => {
    const { history, initialState, undoStacks } = get()

    const userStack = undoStacks.get(userId)
    if (!userStack || userStack.length === 0) return

    // Pop from user's redo stack
    const newStack = [...userStack]
    const entry = newStack.pop()!
    const newUndoStacks = new Map(undoStacks)
    if (newStack.length === 0) {
      newUndoStacks.delete(userId)
    } else {
      newUndoStacks.set(userId, newStack)
    }

    // Reinsert into history
    const newHistory = [...history, entry]

    // Rebuild state
    let rebuiltState = initialState
    for (const e of newHistory) {
      rebuiltState = applyPatches(rebuiltState, e.patches)
    }

    // Update all conflicts
    const allIndices: string[] = []
    for (let row = 0; row < rebuiltState.boardState.length; row++) {
      for (let col = 0; col < rebuiltState.boardState[0].length; col++) {
        allIndices.push(`${row},${col}`)
      }
    }
    useExtensionStore
      .getState()
      .updateConflicts(rebuiltState.boardState, allIndices)

    set({
      gameState: rebuiltState,
      history: newHistory,
      undoStacks: newUndoStacks,
    })
  },

  canUndo: (userId) => {
    return get().history.some((entry) => entry.userId === userId)
  },

  canRedo: (userId) => {
    const stack = get().undoStacks.get(userId)
    return !!stack && stack.length > 0
  },

  applyRemotePatches: (patches, userId) => {
    const { gameState, history } = get()

    const nextState = applyPatches(gameState, patches)

    // Compute inverse patches for proper undo support
    const [, , inversePatches] = produceWithPatches(gameState, (draft) => {
      return applyPatches(draft, patches)
    })

    const newHistory = [...history, { patches, inversePatches, userId }]

    // Update conflicts
    const changedIndices = extractChangedCells(patches)
    if (changedIndices.length > 0) {
      useExtensionStore
        .getState()
        .updateConflicts(nextState.boardState, changedIndices)
    }

    set({
      gameState: nextState,
      history: newHistory,
    })
  },

  loadFullState: (boardState) => {
    const gameState = { boardState }

    // Update all conflicts
    const allIndices: string[] = []
    for (let row = 0; row < boardState.length; row++) {
      for (let col = 0; col < boardState[0].length; col++) {
        allIndices.push(`${row},${col}`)
      }
    }
    useExtensionStore.getState().updateConflicts(boardState, allIndices)

    set({
      gameState,
      initialState: gameState,
      history: [],
      undoStacks: new Map(),
    })
  },
}))
