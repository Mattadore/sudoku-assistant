# src/solver-extensions/ - Extension System

## Current State

### SolverExtensionManager.ts (75 lines)

Manages extension lifecycle and conflict matrix:
- `extensions: { [key: string]: SolverExtension }` -- registry
- `conflictMatrix: ConflictMatrix` -- 9x9 grid, each cell has dependencies (by extension, by cell) and conflicts (by number, with extension attribution)
- `initialize(board, extensions)` -- creates matrix, loads extensions
- `updateCellConflicts(board, indices)` -- incremental update: for each changed cell, for each relevant extension, remove old conflicts and compute new ones
- `loadExtension(extension, board)` -- registers extension, merges settings
- `getConflictMatrix()` -- returns matrix

This will be converted into the `ExtensionProvider` context but the core conflict tracking logic is sound and should be preserved.

### Sudoku.tsx (31 lines) -- MOSTLY COMPLETE

Standard sudoku rules: no duplicate numbers in same row, column, or 3x3 box.
- `extensionName = 'sudoku'`
- `getCellConflicts(board, [row, col])` -- returns array of `[otherRow, otherCol, number]` for all cells in same row/col/box that would conflict
- No `isRelevant` (all cells are relevant for standard sudoku)
- No drawing methods (standard sudoku doesn't need visual elements beyond the grid)

### Thermometer.tsx (53 lines) -- INCOMPLETE

Thermometer constraint: numbers must increase along thermometer paths.
- `extensionName = 'thermometer'`
- `data: ThermoData` -- array of thermometer paths (each path is `BoardIndex[]`)
- `cellToThermoIndex` -- maps cells to their thermometer membership
- `isRelevant(index)` -- only cells on a thermometer
- `updateMetadata()` -- builds `prevCellMap` tracking predecessor cells
- `loadFpuzzleData(data)` -- parses FPuzzle format

**Missing**:
- `getCellConflicts()` -- NOT IMPLEMENTED. Must check that each cell's number is greater than all predecessor cells on its thermometers.
- `drawCell()` / `draw()` -- no visual rendering of thermometer lines. Should draw bulb (circle) at start and a line through the path.

### index.ts (exports)

Currently exports `SolverExtensionManager` and `Extensions = { Sudoku }`. Thermometer is commented out of the export.

## SolverExtension Interface (from declarations.d.ts)

```typescript
interface SolverExtension {
  extensionName: string
  getCellConflicts: (board: BoardState, index: BoardIndex) => number[][]
  isRelevant?: (index: BoardIndex) => boolean
  drawCell?: (board: BoardState, row: number, column: number) => any
  draw?: (board: BoardState) => void
  settings?: { disableDefaultValidation?: boolean }
  loadFpuzzleData?: (data: any) => void
}
```

## Target Extension API

The interface should be expanded to support:

### Conflict Expression (existing, refine)
- `getCellConflicts(board, index)` -- returns `number[][]` where each entry is `[row, col, ...conflictingNumbers]`
- Called incrementally when cells change
- Extension attribution is handled by the extensionStore (conflicts tagged with `extensionName`)

### UI Components (new, hybrid SVG/Canvas)
- `getCellDecoration?: (board: BoardState, row: number, col: number) => React.ReactNode` -- per-cell SVG/React elements rendered inside GridCell (e.g., small killer cage totals). SVG-based for composability.
- `getBoardOverlay?: (board: BoardState) => React.ReactNode` -- whole-board overlay. Can be SVG for simple cases (thermometer lines) or a canvas-based component for performance-intensive drawing. Extensions choose which approach fits.
- These replace the current `drawCell`/`draw` methods. The old canvas-only approach becomes one option within the hybrid system.

### Transaction Hooks (new, uses Immer patches)
- `onBeforeCommit?: (patches: Patch[], currentState: GameState) => void` -- called before a transaction commits, lets extensions update internal state based on the incoming patches
- `onAfterCommit?: (newState: GameState, patches: Patch[]) => void` -- called after commit with final state

### Puzzle Data Loading (revised)
- `loadPuzzleData?: (data: PuzzleConstraint['data']) => void` -- load from internal PuzzleDefinition format. Each extension receives its typed constraint data (e.g., Thermometer gets `{ lines: BoardIndex[][] }`).
- The old `loadFpuzzleData` is replaced by the internal format loader. FPuzzles conversion happens upstream in the import pipeline (see `samples/CLAUDE.md`).
- Extensions should not need to know about fpuzzles format directly -- the converter handles all format translation.

### Settings (existing)
- `settings?: { disableDefaultValidation?: boolean, [key: string]: any }` -- extension-level settings
- `getSidebarControls?: () => React.ReactNode` -- extensions can contribute UI to the sidebar for their settings

## Planned Extensions

### Sudoku (existing, complete)
Standard row/col/box rules. No visual elements needed.

### Thermometer (existing, needs completion)
- Complete `getCellConflicts`: for each cell on a thermometer, check that its number is strictly greater than all cells before it on the same thermometer
- Add `getBoardOverlay`: draw thermometer paths as SVG lines with a circle at the bulb end
- Thermometer visual: bulb (filled circle) at start, line connecting all cells in order

### Future extensions (not yet started)
- **Killer Cages**: groups of cells that must sum to a given total, no repeats within cage. Needs cage border drawing + sum labels.
- **Arrow**: cells along an arrow must sum to the value in the circle. Needs arrow drawing.
- **Diagonal**: main diagonals must contain 1-9 with no repeats. Needs diagonal line drawing.
- **Knight/King**: cells a chess knight's/king's move apart cannot contain the same number. Pure conflict logic, no drawing.
- **Sandwich**: clues outside the grid indicating the sum between the 1 and 9 in that row/col.

## Thermometer Drawing Approach (SVG overlay)

Thermometers are simple enough for SVG. The extension's `getBoardOverlay` returns an SVG element positioned over the board. Since cells are 5rem x 5rem with known box gaps, the SVG coordinate system maps cell indices to pixel positions:
- `x = col * cellSize + boxGapOffset(col)`
- `y = row * cellSize + boxGapOffset(row)`

The thermometer is drawn as:
1. A `<circle>` at the first cell (the bulb)
2. A `<polyline>` or `<path>` through all cell centers
3. Styled with a semi-transparent fill/stroke so numbers remain readable

## Drawing API: Hybrid SVG/Canvas

Extensions choose which rendering approach fits their needs:

**SVG (default for simple overlays)**:
- Per-cell decorations (`getCellDecoration`) are always SVG/React elements
- Board overlays (`getBoardOverlay`) can return SVG for simple geometry (thermos, cages, arrows)
- Composable, debuggable, works with React devtools, easy hit testing

**Canvas (escape hatch for whole-board drawing)**:
- Board overlays can alternatively return a component that renders to a `<canvas>`
- Used when performance matters (many elements, complex paths, animations)
- Extension receives a canvas ref and draws imperatively
- The BoardOverlay component manages canvas layers per-extension

This keeps the common case simple (return JSX) while allowing performance-critical extensions to drop to canvas.
