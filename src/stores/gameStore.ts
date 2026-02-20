import { create } from 'zustand'
import { produceWithPatches, applyPatches, enablePatches, Patch } from 'immer'
import { useExtensionStore } from './extensionStore'

enablePatches()

export interface GridConfig {
  rows: number
  cols: number
  regions: number[][]
}

export interface GameState {
  boardState: BoardState
  gridConfig: GridConfig
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
  /** Flat solution provided by the puzzle source (index = row*cols+col), if any */
  knownSolution: number[] | null

  dispatch: (mutator: (draft: GameState) => void, userId: string) => Patch[]
  undo: (userId: string) => void
  redo: (userId: string) => void
  canUndo: (userId: string) => boolean
  canRedo: (userId: string) => boolean
  applyRemotePatches: (patches: Patch[], userId: string) => void
  loadFullState: (boardState: BoardState, gridConfig?: GridConfig) => void
  initializeBoard: (rows: number, cols: number, regions?: number[][]) => void
  setKnownSolution: (sol: number[] | null) => void
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

export function computeDefaultRegions(rows: number, cols: number): number[][] {
  // Find largest factor of rows that is <= sqrt(rows) for box height
  // 9→3, 6→2, 4→2, 8→2, 16→4
  let boxH = 1
  for (let f = Math.floor(Math.sqrt(rows)); f >= 1; f--) {
    if (rows % f === 0) {
      boxH = f
      break
    }
  }
  const boxW = rows === cols ? rows / boxH : cols

  const regionsPerRow = Math.ceil(cols / boxW)
  const regions: number[][] = []
  for (let r = 0; r < rows; r++) {
    regions.push([])
    for (let c = 0; c < cols; c++) {
      const regionRow = Math.floor(r / boxH)
      const regionCol = Math.floor(c / boxW)
      regions[r].push(regionRow * regionsPerRow + regionCol)
    }
  }
  return regions
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

const emptyState: GameState = {
  boardState: createEmptyBoard(9, 9),
  gridConfig: { rows: 9, cols: 9, regions: computeDefaultRegions(9, 9) },
}

export const useGameStore = create<GameStore>()((set, get) => ({
  gameState: emptyState,
  history: [],
  undoStacks: new Map(),
  initialState: emptyState,
  knownSolution: null,

  setKnownSolution: (sol) => set({ knownSolution: sol }),

  initializeBoard: (rows, cols, regions?) => {
    const boardState = createEmptyBoard(rows, cols)
    const gridConfig: GridConfig = {
      rows,
      cols,
      regions: regions ?? computeDefaultRegions(rows, cols),
    }
    const gameState = { boardState, gridConfig }
    set({
      gameState,
      initialState: gameState,
      history: [],
      undoStacks: new Map(),
      knownSolution: null,
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

  loadFullState: (boardState, gridConfig?) => {
    const rows = boardState.length
    const cols = boardState[0]?.length ?? 0
    const config = gridConfig ?? {
      rows,
      cols,
      regions: computeDefaultRegions(rows, cols),
    }
    const gameState = { boardState, gridConfig: config }

    // Update all conflicts
    const allIndices: string[] = []
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
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
