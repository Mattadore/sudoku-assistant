# src/pages/ - Page Components

## Current State

### index.tsx (1120 lines) -- THE MAIN REFACTOR TARGET

Monolithic class component (`Page`) that currently owns:
- Board state and history array (linear undo/redo)
- User selection/color state
- Multi-user data map
- PeerJS networking (host/client logic, connection management)
- Conflict matrix computation
- SolverExtensionManager instance
- All keyboard handling
- All cell selection logic
- Image overlay handling
- Sidebar UI (inlined as memoized method)
- Grid rendering with 81 memoized GridCell instances

**Key methods to extract**:
- `mutateBoard()` -> StateProvider (transaction dispatch)
- `updateConflicts()` -> ExtensionProvider
- `traverseBoardHistory()` -> StateProvider (undo/redo)
- `initializePeer()`, `initiateClient()`, `connectionCallback()`, host/client data methods -> NetworkProvider
- `select()`, `selectCellsIf()`, `mutateSelectedCells()` -> local component state or a selection hook
- `keyCallback()` -> custom `useKeyboardHandler` hook
- `toggleAnnotation()` -> can live in the keyboard handler or a board mutation helper
- `fileInput()`, `imageLoad()` -> image handling hook or component
- `updateUserdata()` -> UserState management in StateProvider or a dedicated hook

### Other pages (low priority)

- `decode.tsx` (26 lines) -- base64 decompression utility, standalone, keep as-is
- `404.tsx` (10 lines) -- standard 404, keep as-is
- `goose.tsx`, `material.tsx` -- test/placeholder pages, **delete these**

## Target State (Next.js + Zustand)

After migrating from Gatsby to Next.js, `index.tsx` (or `page.tsx` in Next.js App Router) becomes a thin shell:

```tsx
const Page = () => {
  return (
    <GameProvider>
      <NetworkProvider>
        <ExtensionProvider extensions={[new Sudoku()]}>
          <Board />
          <Sidebar />
        </ExtensionProvider>
      </NetworkProvider>
    </GameProvider>
  )
}
```

Provider components handle initialization/lifecycle. Actual state access is via Zustand hooks:
- `useGameStore(selector)` for board state, dispatch, undo/redo
- `useNetworkStore(selector)` for connection status, host/join
- `useExtensionStore(selector)` for conflicts, extension UI

The `Board` component handles:
- Grid layout (CSS grid, 9x9)
- Keyboard event handling (via `useKeyboardHandler` hook)
- Cell selection state (via `useSelection` hook)
- Renders GridCell components + BoardOverlay (extension overlays)
- Image overlay canvases (kept)

The `Sidebar` component is completely rewritten (see `src/components/CLAUDE.md`).

## Migration Strategy

1. Migrate Gatsby to Next.js (framework swap)
2. Extract networking into networkStore + NetworkProvider (most self-contained)
3. Extract state/history into gameStore + GameProvider (with `produceWithPatches`)
4. Extract extension management into extensionStore + ExtensionProvider
5. Convert Page class to functional component
6. Extract keyboard handling into `useKeyboardHandler` hook
7. Extract selection logic into `useSelection` hook
8. Keep image handling, extract into `useImageOverlay` hook
9. Delete goose.tsx and material.tsx

## Known Bugs in Current Code

- `hostProcessData()` (~line 719): Uses hardcoded string `'id'` instead of actual client ID when merging multiUserdata
- `componentDidUpdate` (lines 417-424): Commented out, was previously used for conflict validation
