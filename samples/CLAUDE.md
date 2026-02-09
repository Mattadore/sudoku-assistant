# samples/ - Puzzle Sample Data & Format Documentation

## Contents

- `fpuzsample1.json` -- Decoded fpuzzles puzzle: "REM Tagesmörder" (killer cages + antiknight)
- `fpuzthermo1.json` -- Decoded fpuzzles puzzle: "Mephisto" (thermometers + colored lines)
- `fpuzmisc.json` -- Decoded fpuzzles puzzle: "Mephisto" variant (thermos + antiknight + custom regions + colored lines)
- `thing.json` -- Same as fpuzmisc but with different thermo subset
- `sampledata.json` -- Raw base64-encoded puzzle strings in three formats: `ctc`, `fpuzzle`, `penpa`
- `ctssample.json` -- Decoded penpa+ format puzzle (different format, not fpuzzles)

## FPuzzles Format Specification

F-puzzles (f-puzzles.com) is a popular sudoku puzzle sharing tool. There is no formal public specification; the format is defined by the site's JavaScript source. This section documents the format as observed from samples and community reverse-engineering.

### Encoding

FPuzzles URLs contain a base64-encoded, LZ-string compressed JSON string. The import pipeline is:
1. Extract the base64 string from the URL (after `?load=`)
2. Decompress using LZ-string's `decompressFromBase64()`
3. Parse as JSON

The `external/Compression.js` file in this project wraps LZ-string and can handle this decompression.

### Cell Reference Format

All cell references use the format `"R{row}C{col}"` where row and col are **1-indexed**.
- `"R1C1"` = top-left cell
- `"R9C9"` = bottom-right cell (in a 9x9 grid)

Our internal format uses `"row,col"` strings (0-indexed). Conversion: `R{r}C{c}` -> `"${r-1},${c-1}"`.

### Top-Level JSON Structure

```typescript
interface FPuzzleData {
  // -- Metadata --
  size: number                    // Grid size (typically 9)
  title?: string                  // Puzzle title
  author?: string                 // Puzzle author
  ruleset?: string                // Human-readable rules description

  // -- Grid --
  grid: FPuzzleCell[][]           // size x size array of cell objects

  // -- Boolean constraint flags --
  antiknight?: boolean            // No same digit a knight's move apart
  antiking?: boolean              // No same digit a king's move apart
  disjointgroups?: boolean        // Same position in each box must differ
  nonconsecutive?: boolean        // Orthogonally adjacent cells can't be consecutive
  'diagonal+'?: boolean           // Positive diagonal (bottom-left to top-right) all different
  'diagonal-'?: boolean           // Negative diagonal (top-left to bottom-right) all different

  // -- Line-based constraints --
  thermometer?: FPuzzleLineConstraint[]     // Digits increase from bulb
  palindrome?: FPuzzleLineConstraint[]      // Reads same forwards and backwards
  arrow?: FPuzzleArrowConstraint[]          // Digits on arrow sum to circle
  betweenline?: FPuzzleLineConstraint[]     // Digits between endpoints are between endpoint values
  renban?: FPuzzleLineConstraint[]          // Consecutive set in any order, no repeats
  whispers?: FPuzzleLineConstraint[]        // Adjacent cells differ by >= 5

  // -- Generic colored lines (cosmetic or custom constraints) --
  line?: FPuzzleColoredLine[]

  // -- Region-based constraints --
  killercage?: FPuzzleKillerCage[]          // Sum to value, no repeats in cage
  extraregion?: FPuzzleCellGroup[]          // Extra region, all different
  clone?: FPuzzleClone[]                    // Cloned regions, identical digits

  // -- Cell-based constraints --
  odd?: FPuzzleCellMarker[]                 // Cell must be odd
  even?: FPuzzleCellMarker[]                // Cell must be even
  minimum?: FPuzzleCellMarker[]             // Cell is local minimum
  maximum?: FPuzzleCellMarker[]             // Cell is local maximum

  // -- Border/edge constraints --
  difference?: FPuzzleBorderConstraint[]    // White kropki dot (differ by 1)
  ratio?: FPuzzleBorderConstraint[]         // Black kropki dot (ratio of 2)
  xv?: FPuzzleBorderConstraint[]            // X (sum 10) or V (sum 5) between cells

  // -- Corner constraints --
  quadruple?: FPuzzleQuadruple[]            // Digits that must appear in surrounding cells

  // -- Outside clue constraints --
  littlekillersum?: FPuzzleOutsideClue[]    // Diagonal sum clue outside grid
  sandwich?: FPuzzleOutsideClue[]           // Sum between 1 and 9 in row/col

  // -- Cosmetic elements (no logic) --
  cage?: FPuzzleCosmeticCage[]
  text?: FPuzzleCosmeticText[]
  rectangle?: FPuzzleCosmeticRect[]
  circle?: FPuzzleCosmeticCircle[]

  // -- Negative constraints (which constraint types have negative inference) --
  negative?: string[]
}
```

### Sub-Types

```typescript
interface FPuzzleCell {
  value?: number          // Given digit (1-9)
  given?: boolean         // Whether this is a given (locked) cell
  c?: string              // Background color (hex string, e.g. "#A8A8A8")
  region?: number         // Custom region number (overrides default 3x3 boxes)
  centerPencilMarks?: number[]
  givenPencilMarks?: number[]
}

// Used by: thermometer, palindrome, betweenline, renban, whispers
interface FPuzzleLineConstraint {
  lines: string[][]       // Array of paths, each path is array of "R{r}C{c}" strings
}

// Arrow: circle cell(s) + arrow line(s) that sum to circle value
interface FPuzzleArrowConstraint {
  lines: string[][]       // Arrow paths (first cell of first line is the circle)
  cells: string[]         // Circle cells
}

// Generic colored line (used for custom/cosmetic constraints)
interface FPuzzleColoredLine {
  lines: string[][]       // Path(s) of cells
  outlineC: string        // Outline color (hex, e.g. "#FF00F2")
  width: number           // Line width (e.g. 0.3)
  isNewConstraint?: boolean // Flag for extension constraints
}

// Killer cage
interface FPuzzleKillerCage {
  cells: string[]         // Cells in cage ("R{r}C{c}" format)
  value?: string          // Cage total (string, e.g. "12")
}

// Cell group (extra region, etc.)
interface FPuzzleCellGroup {
  cells: string[]
}

// Clone regions
interface FPuzzleClone {
  cells: string[]         // First region cells
  cloneCells: string[]    // Matching second region cells
}

// Cell markers (odd, even, min, max)
interface FPuzzleCellMarker {
  cell: string            // "R{r}C{c}"
}

// Border constraints (difference, ratio, XV)
interface FPuzzleBorderConstraint {
  cells: string[]         // Two adjacent cells
  value?: string          // For XV: "X" or "V"
}

// Quadruple clue (at intersection of 4 cells)
interface FPuzzleQuadruple {
  cells: string[]         // The 4 surrounding cells
  values: number[]        // Digits that must appear in those cells
}

// Outside clues (little killer, sandwich)
interface FPuzzleOutsideClue {
  cell: string            // Clue cell position (outside grid)
  direction?: string      // Direction the clue applies
  value?: string          // Clue value
}

// Cosmetic elements (no solving logic)
interface FPuzzleCosmeticCage {
  cells: string[]
  value?: string
  outlineC?: string
  fontC?: string
}

interface FPuzzleCosmeticText {
  cells: string[]
  value?: string
  fontC?: string
  size?: number
}

interface FPuzzleCosmeticRect {
  cells: string[]
  width?: number
  height?: number
  baseC?: string
  outlineC?: string
}

interface FPuzzleCosmeticCircle {
  cells: string[]
  width?: number
  height?: number
  baseC?: string
  outlineC?: string
}
```

## Internal Puzzle Format (Target)

Our internal `PuzzleDefinition` format is what fpuzzles (and future formats) convert into. It drives which extensions to load and how to configure them.

```typescript
interface PuzzleDefinition {
  metadata: {
    title?: string
    author?: string
    ruleset?: string
    source?: 'fpuzzles' | 'ctc' | 'penpa' | 'internal'
    sourceUrl?: string
  }
  grid: {
    size: number
    regions?: number[][]    // Custom regions (if not standard 3x3 boxes)
    cells: PuzzleCell[][]   // Initial cell state (givens, colors)
  }
  constraints: PuzzleConstraint[]  // Determines which extensions to load + their config
}

interface PuzzleCell {
  given?: number            // Given digit (locked, cannot be edited)
  color?: string            // Background color
}

// Each constraint maps to an extension by type name
type PuzzleConstraint =
  | { type: 'sudoku' }
  | { type: 'thermometer', data: { lines: BoardIndex[][] } }
  | { type: 'killercage', data: { cages: { cells: BoardIndex[], total: number }[] } }
  | { type: 'arrow', data: { arrows: { circle: BoardIndex[], line: BoardIndex[][] }[] } }
  | { type: 'antiknight' }
  | { type: 'antiking' }
  | { type: 'diagonal+' }
  | { type: 'diagonal-' }
  | { type: 'palindrome', data: { lines: BoardIndex[][] } }
  | { type: 'renban', data: { lines: BoardIndex[][] } }
  | { type: 'whispers', data: { lines: BoardIndex[][] } }
  | { type: 'betweenline', data: { lines: BoardIndex[][] } }
  | { type: 'sandwich', data: { clues: { position: BoardIndex, direction: string, value: number }[] } }
  | { type: 'littlekillersum', data: { clues: { position: BoardIndex, direction: string, value: number }[] } }
  | { type: 'difference', data: { pairs: { cells: [BoardIndex, BoardIndex], value?: number }[] } }
  | { type: 'ratio', data: { pairs: { cells: [BoardIndex, BoardIndex], value?: number }[] } }
  | { type: 'xv', data: { pairs: { cells: [BoardIndex, BoardIndex], value: 'X' | 'V' }[] } }
  | { type: 'quadruple', data: { quadruples: { cells: BoardIndex[], values: number[] }[] } }
  | { type: 'odd', data: { cells: BoardIndex[] } }
  | { type: 'even', data: { cells: BoardIndex[] } }
  | { type: 'minimum', data: { cells: BoardIndex[] } }
  | { type: 'maximum', data: { cells: BoardIndex[] } }
  | { type: 'nonconsecutive' }
  | { type: 'disjointgroups' }
  | { type: 'extraregion', data: { regions: BoardIndex[][] } }
  | { type: 'clone', data: { clones: { cells: BoardIndex[], cloneCells: BoardIndex[] }[] } }
  | { type: string, data?: unknown }  // Extensible for future/custom types
```

## Import Pipeline

```
FPuzzles URL
  ↓ extract base64 after ?load=
Base64 string
  ↓ LZ-string decompressFromBase64()
JSON string
  ↓ JSON.parse()
FPuzzleData (fpuzzles format)
  ↓ convertFPuzzleToPuzzle()
PuzzleDefinition (internal format)
  ↓ loadPuzzle()
  ├── Populate GameState.boardState with givens/colors
  ├── Load custom regions if present
  ├── For each constraint:
  │   ├── Register the matching extension
  │   └── Feed constraint data to extension.loadPuzzleData()
  └── Initialize conflict matrix
```

## Format Differences Summary

| Feature | FPuzzles | Internal |
|---------|----------|----------|
| Cell refs | `"R1C1"` (1-indexed) | `[0, 0]` or `"0,0"` (0-indexed) |
| Booleans | Top-level keys (`antiknight: true`) | Constraint entries (`{ type: 'antiknight' }`) |
| Line data | Nested `{ lines: [["R1C1", ...]] }` | Flat `{ lines: [[0,0], ...] }` |
| Cage totals | String (`"12"`) | Number (`12`) |
| Regions | Per-cell `region` field | Grid-level `regions` array |
| Cosmetics | Mixed with constraints | Separated (future: cosmetic layer) |
