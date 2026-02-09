# src/contexts/ - Store & Provider Architecture

## Current State

Contains two fully commented-out class-based context attempts (`DataContext.tsx`, `GameContext.tsx`) from an abandoned refactor. These should be **deleted entirely**.

## Target Architecture: Zustand Stores + Thin React Providers

State lives in Zustand stores (accessed via hooks with selectors). React context providers handle initialization and lifecycle only. This avoids stale closures (Zustand selectors always return fresh values) and prevents re-render cascades (components only re-render when their selected slice changes).

### 1. gameStore (Zustand + Immer)

**Owns**: GameState, transaction system, history

**GameState** includes:
- `boardState: BoardState` (the 9x9 grid of `CellData`)
- Extension-owned global state (future: synchronized across network)

**UserState** (separate, per-user):
- `selectorIndex`, `selectedIndices`, `color`, UI preferences
- Saved to localStorage, owned by each client
- Could be a separate small Zustand store or local component state

**Transaction system** using `produceWithPatches`:
```ts
dispatch(mutator: (draft: GameState) => void, userId: string) {
  const [nextState, patches, inversePatches] = produceWithPatches(state, mutator)
  // Run through extensions before commit
  extensionStore.getState().onBeforeCommit(patches, state)
  // Record in history
  history.push({ patches, inversePatches, userId })
  // Apply
  set({ gameState: nextState })
  // Notify extensions after commit
  extensionStore.getState().onAfterCommit(nextState, patches)
}
```

**History (rollback netcode)**:
```ts
type HistoryEntry = {
  patches: Patch[]
  inversePatches: Patch[]
  userId: string
}

history: HistoryEntry[]
undoStacks: Map<string, HistoryEntry[]>  // per-user
initialState: GameState                   // base state for replay
```

- `undo(userId)`: Find user's most recent entry in history, remove it, push to their undo stack. Rebuild current state by applying all remaining patches to `initialState` via `applyPatches`.
- `redo(userId)`: Pop from user's undo stack, reinsert into history at original position (or end), rebuild.
- User's undo stack clears when they take a new action (dispatch).

**Store shape**:
```ts
interface GameStore {
  gameState: GameState
  history: HistoryEntry[]
  undoStacks: Map<string, HistoryEntry[]>
  initialState: GameState

  dispatch: (mutator: (draft: GameState) => void, userId: string) => void
  undo: (userId: string) => void
  redo: (userId: string) => void
  canUndo: (userId: string) => boolean
  canRedo: (userId: string) => boolean
  resetGame: (newState: GameState) => void
}
```

### 2. networkStore (Zustand)

**Owns**: PeerJS connection, host/client logic, JSON Patch transport

**Store shape**:
```ts
interface NetworkStore {
  isHost: boolean
  onlineId: string
  hostId: string | null
  connectedPeers: string[]
  connectionStatus: 'disconnected' | 'connecting' | 'connected'
  peer: Peer | null          // mutable, not reactive

  initializePeer: () => Promise<void>
  hostGame: () => void
  joinGame: (hostId: string) => void
  disconnect: () => void
  sendPatches: (patches: Patch[]) => void
}
```

**Host mode**: Listens for connections, receives patches from clients, dispatches to gameStore, broadcasts committed patches to all clients.

**Client mode**: Connects to host, sends local patches, receives authoritative patches and applies via `applyPatches`.

PeerJS `Peer` and `DataConnection` objects stored as non-reactive refs (they're mutable handles, not render state). Only connection status and peer list are reactive.

### 3. extensionStore (Zustand)

**Owns**: Extension registry, conflict matrix, extension UI slots

Converted from current `SolverExtensionManager`. Core conflict logic preserved.

**Store shape**:
```ts
interface ExtensionStore {
  extensions: Map<string, SolverExtension>
  conflictMatrix: ConflictMatrix
  boardOverlays: Map<string, React.ComponentType<{ board: BoardState }>>
  cellDecorations: Map<string, (row: number, col: number, board: BoardState) => React.ReactNode>
  sidebarControls: Map<string, React.ComponentType>

  registerExtension: (ext: SolverExtension) => void
  unregisterExtension: (name: string) => void
  updateConflicts: (board: BoardState, changedIndices: string[]) => void
  onBeforeCommit: (patches: Patch[], currentState: GameState) => void
  onAfterCommit: (newState: GameState, patches: Patch[]) => void
  getConflictData: (row: number, col: number) => ConflictData
}
```

**Extension UI API** (hybrid SVG/Canvas):
- `getBoardOverlay?: (board: BoardState) => React.ReactNode` -- SVG elements for simple overlays (default), or canvas rendering callback for performance-intensive drawing
- `getCellDecoration?: (board: BoardState, row: number, col: number) => React.ReactNode` -- per-cell SVG/React elements
- `getSidebarControls?: () => React.ReactNode` -- extension settings in sidebar

### React Provider Wrappers

Thin provider components handle initialization only:

```tsx
// GameProvider: initializes gameStore with default board, wraps children
// NetworkProvider: initializes PeerJS on mount, cleanup on unmount
// ExtensionProvider: registers initial extensions, provides initialization lifecycle
```

These are still nested as:
```
GameProvider > NetworkProvider > ExtensionProvider > App UI
```

But components access state via Zustand hooks, not React context:
```ts
// In a GridCell:
const cellData = useGameStore(state => state.gameState.boardState[row][col])
const conflicts = useExtensionStore(state => state.conflictMatrix[row][col])
```

## Key Design Benefits

1. **No stale closures**: Zustand selectors always read latest state
2. **Minimal re-renders**: Each GridCell subscribes only to its own data slice
3. **No prop drilling**: Any component can access any store
4. **Immer patches as first-class diffs**: `produceWithPatches` gives patches + inverse patches automatically
5. **Clean history**: Array of `{ patches, inversePatches, userId }`, replay via `applyPatches`

## Files to Create

- `src/stores/gameStore.ts` -- GameState, transactions, history
- `src/stores/networkStore.ts` -- PeerJS, host/client
- `src/stores/extensionStore.ts` -- extensions, conflicts, UI slots
- `src/providers/GameProvider.tsx` -- initialization wrapper
- `src/providers/NetworkProvider.tsx` -- PeerJS lifecycle
- `src/providers/ExtensionProvider.tsx` -- extension registration

## Files to Delete

- `src/contexts/DataContext.tsx` (fully commented out)
- `src/contexts/GameContext.tsx` (fully commented out)
