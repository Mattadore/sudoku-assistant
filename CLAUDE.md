# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Vision

A complex sudoku app with a robust extension system supporting all common puzzle modifiers (thermometers, killer cages, arrows, etc.). The extension system is designed so that new rules compose sanely together, with conflict tracking that records both which cells conflict and which extension/rule caused each conflict.

## Build & Development Commands

```bash
yarn dev              # Start dev server on localhost:8080
yarn build            # Production build via Next.js
yarn start            # Start production server on localhost:8080
yarn format           # Prettier (no semicolons, single quotes, trailing commas)
```

No test framework is configured.

## Current Branch Status

**Branch `development` is mid-refactor. Phases 0-1 complete (Next.js migration + cleanup). Build succeeds.** Continuing with Phase 2 (Zustand stores). See [Refactor Plan](#refactor-plan) below.

## Tech Stack

**Current** (Phase 0-1 complete):
- **Framework**: Next.js 14 (Pages Router) + React 18 (class components, converting to functional)
- **Language**: TypeScript 5.0 (strict mode, `noUnusedLocals`, `noUnusedParameters`)
- **Styling**: Emotion CSS-in-JS + Material UI 5
- **Networking**: PeerJS for P2P multiplayer
- **State**: Immer for immutable updates (manual diff functions in helper.tsx, to be replaced)
- **New deps**: Zustand (installed, not yet used)

**Target** (post-refactor):
- **Framework**: Next.js 14 + React 18 (functional components throughout)
- **Language**: TypeScript (strict mode)
- **Styling**: Emotion CSS-in-JS + Material UI 5 (keep)
- **Networking**: PeerJS for P2P multiplayer (keep)
- **State**: Zustand stores + Immer `produceWithPatches` for automatic JSON Patch diffs
- **Drawing**: Hybrid SVG (per-cell decorations) + Canvas (whole-board overlays)

## Path Aliases

Configured in tsconfig.json with `baseUrl: "./src"` and `paths`. Resolved natively by Next.js:
- `components` -> `./src/components`
- `external` -> `./src/external`
- `helper` -> `./src/helper.tsx`
- `solver-extensions` -> `./src/solver-extensions`

## Code Style

- Prettier: no semicolons, single quotes, trailing commas (all)
- Tab size: 2 spaces
- JSX import source: `@emotion/react` (enables css prop without importing React)

## Architecture (Current -> Target)

### State Model

Two kinds of state:
- **GameState**: Board state + global extension state. Owned by host, authoritative. Includes the full board, conflict matrix, and extension-owned data.
- **UserState**: Per-user, owned by each client. Includes selection, color, UI preferences. Saved to localStorage.

### Transaction System (Target)

All input and data flows tracked as **transactions** using Immer's `produceWithPatches`:

```ts
const [nextState, patches, inversePatches] = produceWithPatches(state, draft => {
  // mutation logic
})
```

1. User action calls a transaction function (mutates an Immer draft)
2. `produceWithPatches` produces the new state + JSON Patches (RFC 6902) + inverse patches automatically
3. Before commit: transaction is run through all active extensions so they can update internal state
4. After commit: `{ patches, inversePatches, userId }` is recorded in history
5. Fully deterministic, including extension behavior
6. Replaces all custom diff functions in helper.tsx (`getBoardDiff`, `getDiff`, `getDeepDiff`, `inplaceMerge`, `createMerge`)

### History & Undo/Redo (Target: Rollback Netcode)

Replace current linear undo/redo with rollback-style history:

```ts
type HistoryEntry = { patches: Patch[], inversePatches: Patch[], userId: string }
```

- **History**: Ordered list of `HistoryEntry` on the host
- **Undo**: Remove user's most recent entry from history, rebuild state by replaying all remaining patches from initial state. Removed entry goes into per-user undo stack.
- **Redo**: Pop from per-user undo stack, reinsert into history, rebuild.
- Per-user undo stack clears when that user takes a new action.
- `applyPatches(state, patches)` for replay.

### Store Architecture (Zustand + Immer)

Three Zustand stores replace the monolithic class component state:

```
gameStore        (GameState, transaction dispatch, history with rollback undo/redo)
networkStore     (PeerJS connection, host/client logic, diff transport)
extensionStore   (extension registry, conflict matrix, extension UI slots)
```

Each store uses Zustand's Immer middleware. Components subscribe via selectors, preventing unnecessary re-renders (e.g., each GridCell subscribes only to its own cell data). No stale closure issues since Zustand selectors always return fresh values.

React context providers still wrap the app for initialization/lifecycle, but state access goes through Zustand hooks.

### Core Page (`src/pages/index.tsx`) - NEEDS REFACTOR

Currently a single 1120-line class component that owns everything. Must be broken into Zustand stores + thin functional components. Class components were used to avoid stale closure issues; Zustand solves this by design.

### Solver Extension System (`src/solver-extensions/`)

Plugin architecture for sudoku variant constraints. Each extension implements `SolverExtension` (defined in `src/declarations.d.ts`):
- `getCellConflicts(board, index)` -- returns conflicting cell+number pairs
- Optional: `isRelevant`, `drawCell`, `draw`, `loadFpuzzleData`
- Extensions can optionally contribute UI elements (global board overlays and per-cell elements)
- Conflict matrix tracks bidirectional dependencies with extension attribution

Currently implemented: `Sudoku` (standard row/col/box rules). `Thermometer` is partial (missing `getCellConflicts`).

Goal: Move as much internal logic as possible into extensions. Expose a few simple methods (adding UI components, drawing board elements, expressing conflicts) that let extensions implement complex functionality modularly.

### Puzzle Import System

FPuzzles is the primary import format. Pipeline: base64 -> LZ-string decompress -> JSON -> `FPuzzleData` -> `PuzzleDefinition` (internal) -> load extensions + configure.

The internal `PuzzleDefinition` format is a normalized representation that:
- Converts fpuzzles `"R1C1"` (1-indexed) cell refs to our `[0,0]` BoardIndex (0-indexed)
- Represents all constraints as typed entries mapping to extensions
- Separates cosmetic elements from logical constraints
- Drives which extensions to load and how to configure them

See `samples/CLAUDE.md` for full format documentation and TypeScript types.

### Key Data Types (`src/declarations.d.ts`)

All core types are declared globally (no imports needed):
- `CellData`: number, center/corner annotations, color
- `BoardState`: `CellData[][]`
- `ConflictData`: dependencies (by extension, by cell) + conflicts (by number)
- `ConflictMatrix`: `ConflictData[][]`
- `Diff<T>`: recursive partial type for diffs (being replaced by Immer Patch)
- `SolverExtension`: interface for variant plugins
- `PuzzleDefinition`: internal puzzle format
- `FPuzzleData`: fpuzzles import format
- `PuzzleConstraint`: typed constraint entries

### Cell Indexing Convention

Cells are `"row,col"` strings (e.g. `"3,5"`). Use `stringIndex()` and `splitIndex()` from helper. `BoardIndex` is tuple `[row, col]`.

### Multiplayer (PeerJS)

Host-client P2P model. Host is authoritative over GameState. Changes sent as JSON Patches (from `produceWithPatches`) and applied with `applyPatches`.

### Rendering Layers

Stacked canvas/div layers with z-index ordering:
- Annotations layer (z-index: 300)
- Extensions layer (z-index: 250)
- Image overlay layer (z-index: 200)

`GridCell` components use Zustand selectors for fine-grained subscriptions (81 instances for 9x9 grid).

### Extension Overlays

Extensions can provide `getBoardOverlay(board, cellSize)` to render SVG overlays on the board (e.g., thermometer lines). These are rendered via the `ExtensionOverlays` component inside `Board.tsx`, positioned absolutely over the grid at z-index 100.

### Puzzle Import

FPuzzles URL → base64 → LZ-string decompress → JSON → `FPuzzleData` → `convertFPuzzleToPuzzle()` → `PuzzleDefinition` → `loadPuzzle()`. Import UI in Sidebar. Uses `external/Compression.js` for LZ-string.

## Refactor Plan

### Phase 0: Framework Migration -- COMPLETE

1. ~~**Migrate from Gatsby to Next.js**~~: Replaced Gatsby config/plugins/routing with Next.js 14 Pages Router. Path aliases via tsconfig `baseUrl`/`paths`.
2. ~~**Update dependencies**~~: Removed Gatsby + plugins, react-helmet, semantic-ui. Added Next.js 14, Zustand 4.5. Moved @types to devDependencies.
3. ~~**Add new dependencies**~~: Zustand installed.

### Phase 1: Cleanup -- COMPLETE

4. ~~**Delete dead code**~~: Deleted DataContext.tsx, GameContext.tsx, Sidebar.tsx (component), goose.tsx, material.tsx, gatsby-types.d.ts, layouts/index.tsx, gatsby-config.js, gatsby-browser.js
5. ~~**Fix known bugs**~~: Fixed orphaned `4` + empty loop in helper.tsx, fixed `hostProcessData` hardcoded `'id'` → `[id]`
6. **Custom diff functions** in helper.tsx: Still used by index.tsx. Will be removed in Phase 2 when replaced by `produceWithPatches`.

### Phase 2: State Architecture -- COMPLETE

7. ~~**Create `gameStore`**~~: Zustand + `produceWithPatches`, rollback undo/redo
8. ~~**Create `networkStore`**~~: PeerJS, host/client, JSON Patch transport
9. ~~**Create `extensionStore`**~~: extension registry, conflict matrix
10. ~~**Migrate from class component**~~: functional components + Zustand selectors

### Phase 3: Extension System & Import -- COMPLETE

11. ~~**Define extension UI API**~~: `getBoardOverlay`, `getCellDecoration`, `loadPuzzleData` added to SolverExtension
12. ~~**Complete Sudoku extension**~~: row/col/box conflicts (was already working)
13. ~~**Complete Thermometer extension**~~: `getCellConflicts` implemented (strictly increasing constraint), SVG board overlay (bulb + polyline)
14. ~~**Build puzzle import system**~~: FPuzzleData/PuzzleDefinition types in declarations.d.ts, `src/puzzle/import.ts` with full pipeline, Import UI in Sidebar
15. **Move internal logic into extensions**: deferred to future work

### Phase 4: UI -- COMPLETE

16. ~~**Rewrite sidebar**~~: Split into isolated section components (ImportSection, ColorSection, FileSection, MultiplayerSection, ExtensionsSection, NotesSection), extension sidebar slots via `getSidebarControls`, cleaner MUI design
17. ~~**Clean up GridCell**~~: Granular Zustand selectors (per-field instead of full objects), memoized derived values, reduced re-renders
18. ~~**General code clarity**~~: Extracted `useSelection` + `useKeyboardHandler` to `src/hooks/`, stabilized callbacks with `getState()` pattern, removed Board's full boardState subscription

### Phase 5: Ship

19. **Ensure build succeeds** with all changes
20. **Commit to master**

## Subdirectory Documentation

See nested CLAUDE.md files for detailed plans:
- `src/pages/CLAUDE.md` - Page refactoring plan
- `src/components/CLAUDE.md` - Component restructuring plan
- `src/solver-extensions/CLAUDE.md` - Extension system design
- `src/contexts/CLAUDE.md` - New context/provider architecture (Zustand stores)
- `samples/CLAUDE.md` - FPuzzles format spec, internal puzzle format, import pipeline
