# src/components/ - UI Components

## Current State

### GridCell.tsx (334 lines) -- KEEP AND REFINE

Two-layer memoization pattern:
1. **GridCell** (outer): Receives full props, computes derived values (selectedColors, selectorColors, conflictList)
2. **InternalGridCell** (inner): `React.memo`'d, receives only computed values, does all rendering

Current rendering per cell:
- Background color from CellData or transparent
- Central number display OR center annotation numbers
- Top-left corner annotations
- Bottom-right corner annotations
- Conflict highlighting (red for conflicting numbers)
- Multi-user selection indicators (colored bars on edges)
- Selection circle (yellow)
- Box gap spacing (thicker borders at 3x3 box boundaries)

Z-index layers within a cell: -500 (selection bg), 210 (cell bg), 500 (highlight bars), 2000 (corner annotations), 5000 (central number)

**Needs**:
- Add support for extension cell decorations (query extensionStore for per-cell elements)
- With Zustand selectors, each GridCell subscribes to only its own slice: `useGameStore(s => s.gameState.boardState[row][col])`. This replaces the two-layer memoization pattern -- Zustand handles selective re-rendering by design.
- Review whether the outer GridCell wrapper is still needed at all

### Sidebar.tsx (164 lines) -- FULLY COMMENTED OUT, DELETE AND REWRITE

The old sidebar is commented out here and duplicated inline in `index.tsx`. Both should be discarded.

### index.tsx (exports)

Currently only exports GridCell. Will need to export new components as they're created.

## Target Components

### GridCell (refactored)
- Uses Zustand selectors to subscribe to its own cell data and conflict data
- Queries extensionStore for cell decorations (SVG per-cell elements)
- Single functional component with `React.memo` (no two-layer pattern needed with Zustand)
- Keep the 5rem x 5rem sizing and z-index layering

### Board (new)
- Extracted from index.tsx render method
- CSS Grid layout for 9x9 grid
- Renders 81 GridCell instances
- Renders BoardOverlay on top (extension overlays)
- Handles keyboard events (via useKeyboardHandler hook)
- Owns selection state (via useSelection hook)
- Renders image overlay canvases if an image is loaded (keep this feature)

### Sidebar (new, complete rewrite)
- Clean Material UI accordion or tab-based layout
- Sections:
  - **Color picker**: Cell color selection
  - **Extensions**: Toggle/configure active extensions, extension-contributed settings UI
  - **Multiplayer**: Connection status, host/join controls
  - **Import**: File upload for puzzle images, FPuzzle import
  - **Notes**: Freeform text area
- Access state via Zustand hooks, not props
- Extensions register sidebar controls via extensionStore

### BoardOverlay (new, hybrid SVG/Canvas)
- Renders extension-contributed overlays on top of the grid
- Positioned absolutely over the board
- Each extension's overlay is a separate layer
- SVG overlays (thermometer lines, cage borders) rendered as React elements
- Canvas overlays rendered to per-extension canvas elements for performance-intensive drawing
- Extensions choose which approach via their `getBoardOverlay` return type

## New Hooks to Create

### useKeyboardHandler
- Extracted from `keyCallback` in index.tsx
- Handles number input, annotations, undo/redo, arrow navigation, select all, delete
- Calls `gameStore.dispatch()` for board mutations
- Calls selection hook for navigation

### useSelection
- Extracted from `select()`, `selectCellsIf()`, `mutateSelectedCells()` in index.tsx
- Manages `selectorIndex`, `selectedIndices`
- Supports click, Ctrl+click, Shift+click multi-select
- Arrow key navigation
- Part of UserState (synced to other users via networkStore for multi-user selection display)

### useImageOverlay
- Extracted from `fileInput()`, `imageLoad()`, image processing in index.tsx
- Manages uploaded image state, preprocessing, canvas rendering
- Keep this feature through the refactor (user decision)
- Fix orphaned `4` statements in helper.tsx image processing code
