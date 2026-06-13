/**
 * CTC (Cracking the Cryptic / SudokuPad) puzzle format importer.
 *
 * The CTC format is a JSON5 object with abbreviated keys, compressed with a
 * custom LZW algorithm and base64-encoded. SudokuPad URLs look like:
 *   https://sudokupad.app/ctc<base64data>
 *   https://sudokupad.app/scl<base64data>
 *
 * Cell coordinates in the CTC format use a corner-origin system where [0,0]
 * is the top-left corner of the grid and 1 unit = 1 cell. Cell (r, c)'s
 * center is at coordinate [r + 0.5, c + 0.5]. Our internal cosmetics use a
 * cell-center-origin system where [r, c] = center of cell (r, c). To convert:
 *   our [r, c] = CTC [r + 0.5, c + 0.5] - 0.5 = CTC [r, c] - 0.5
 *
 * Cage cells are 0-indexed integer [row, col] pairs that map directly to
 * BoardIndex with no offset needed.
 */

import JSON5 from 'json5'
import { lzwDecompress, base64ToBytes } from './lzwDecompress'

// Abbreviated key map used by the CTC compact format
const CTC_KEYS: Record<string, string> = {
  c: 'color',
  ca: 'cages',
  ct: 'center',
  c1: 'borderColor',
  c2: 'backgroundColor',
  ce: 'cells',
  cs: 'cellSize',
  a: 'arrows',
  o: 'overlays',
  u: 'underlays',
  w: 'width',
  h: 'height',
  v: 'value',
  l: 'lines',
  r: 'rounded',
  re: 'regions',
  fs: 'fontSize',
  th: 'thickness',
  hl: 'headLength',
  wp: 'wayPoints',
  t: 'title',
  te: 'text',
  d: 'duration',
  d2: 'd',
}

function expandKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(expandKeys)
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      result[CTC_KEYS[k] ?? k] = expandKeys(v)
    }
    return result
  }
  return obj
}

function preprocessCTCData(raw: string): string {
  let data = raw

  // Fix CTC shorthand boolean values (must run before color handling)
  // :t → :true, :f → :false when at the end of a value slot
  data = data.replace(/:t(?=[,}\]\s])/g, ':true')
  data = data.replace(/:f(?=[,}\]\s])/g, ':false')

  // Quote all unquoted hex color values. CTC stores colors as bare hex strings
  // like #FF0000 or #FF0000FF (3–8 hex digits). They can appear:
  //   - after a colon (object value):  c:#FF0000 → c:"#FF0000"
  //   - after a colon with spaces:     c: #FF0000 → c:"#FF0000"
  //   - as an array element after [ or ,:  [#FF0000,…] → ["#FF0000",…]
  // We use a single pass that captures the preceding delimiter as group $1.
  data = data.replace(
    /([,\[:])(\s*)#([0-9a-fA-F]{3,8})(?=[,}\]\s])/g,
    '$1$2"#$3"',
  )

  // Fix JavaScript-style array elisions, which JSON5 doesn't support:
  //   [, value]   → [null, value]  (empty first element)
  //   value,,next → value,null,next (empty middle elements)
  // Apply [, first, then ,, in a loop until the string stabilises.
  data = data.replace(/\[,/g, '[null,')
  let prev: string
  do {
    prev = data
    data = data.replace(/,,/g, ',null,')
  } while (data !== prev)

  // Remove trailing commas before ] and }
  data = data.replace(/,(\s*[}\]])/g, '$1')

  return data
}

function parseCTCString(raw: string): CTCData {
  // Always preprocess: the CTC compact format uses shorthands and array
  // elisions that are not valid JSON5 until normalised.
  const preprocessed = preprocessCTCData(raw)
  try {
    return expandKeys(JSON5.parse(preprocessed)) as CTCData
  } catch (e: any) {
    throw new Error(`CTC parse failed: ${e?.message ?? e}`)
  }
}

function extractPayload(input: string): string {
  const s = input.trim()

  // SudokuPad URL: https://sudokupad.app/ctc<data> or .../scl<data>
  const urlMatch = s.match(/sudokupad\.app\/(ctc|scl)([A-Za-z0-9+/=%]+)/)
  if (urlMatch) return decodeURIComponent(urlMatch[2]).replace(/ /g, '+')

  // Prefixed string: ctc<data> or scl<data>
  if (s.startsWith('ctc') || s.startsWith('scl')) {
    return decodeURIComponent(s.slice(3)).replace(/ /g, '+')
  }

  // Bare base64 payload (no URL or prefix) — treat the whole string as the payload
  if (/^[A-Za-z0-9+/=\s]+$/.test(s)) {
    return s.replace(/ /g, '+')
  }

  throw new Error('Not a CTC puzzle string')
}

export function decodeCTC(input: string): CTCData {
  // If the input looks like raw JSON, parse it directly
  const s = input.trim()
  if (s.startsWith('{')) {
    return parseCTCString(s)
  }

  const payload = extractPayload(s)
  const bytes = base64ToBytes(payload)
  const decompressed = lzwDecompress(bytes)
  if (!decompressed) throw new Error('Failed to decompress CTC puzzle data')
  return parseCTCString(decompressed)
}

// CTC coordinate [r, c] (corner-origin) → our cosmetic coordinate [r-0.5, c-0.5]
function ctcCoord(r: number, c: number): [number, number] {
  return [r - 0.5, c - 0.5]
}

// A CTC line waypoint sits at a cell centre (r+0.5, c+0.5 in corner-origin).
// Convert it to a 0-indexed BoardIndex.
function waypointToCell(r: number, c: number): BoardIndex {
  return [Math.round(r - 0.5), Math.round(c - 0.5)]
}

// Parse a CTC hex colour (#rgb, #rgba, #rrggbb, #rrggbbaa) into RGB channels.
function parseHexColor(hex: string): { r: number; g: number; b: number } | null {
  let h = hex.trim().replace(/^#/, '')
  if (h.length === 3 || h.length === 4) {
    // Shorthand: take the RGB nibbles and double each (#aaf → #aaaaff).
    h = h
      .slice(0, 3)
      .split('')
      .map((ch) => ch + ch)
      .join('')
  } else if (h.length === 6 || h.length === 8) {
    h = h.slice(0, 6)
  } else {
    return null
  }
  const n = parseInt(h, 16)
  if (Number.isNaN(n)) return null
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff }
}

// SudokuPad's SCL format doesn't type line constraints — palindromes are
// encoded as plain grey cosmetic lines (no endpoint bulbs/circles, unlike
// thermometers/between-lines). We treat a roughly grey, mid-toned line as a
// palindrome; coloured lines (renban, whispers, etc.) stay cosmetic.
function isPalindromeColor(color: string | undefined): boolean {
  if (!color) return false
  const rgb = parseHexColor(color)
  if (!rgb) return false
  const max = Math.max(rgb.r, rgb.g, rgb.b)
  const min = Math.min(rgb.r, rgb.g, rgb.b)
  if (max - min > 24) return false // coloured, not greyscale
  return min >= 60 && max <= 230 // exclude near-black borders and near-white
}

export function convertCTCToPuzzle(data: CTCData): PuzzleDefinition {
  const rows = data.cells?.length ?? 9
  const cols = (data.cells?.[0] as CTCCell[] | undefined)?.length ?? rows
  const size = Math.max(rows, cols)

  // Given cells: any cell with a numeric value is a given
  const cells: PuzzleCell[][] = []
  for (let r = 0; r < size; r++) {
    cells.push([])
    for (let c = 0; c < size; c++) {
      const ctcCell = (data.cells?.[r] as CTCCell[] | undefined)?.[c] ?? {}
      const raw = ctcCell.value
      const given =
        typeof raw === 'number'
          ? raw
          : typeof raw === 'string'
            ? parseInt(raw) || undefined
            : undefined
      cells[r].push(given !== undefined ? { given } : {})
    }
  }

  // Regions: CTC regions are arrays of [row, col] pairs for each box group.
  // Convert to our regions[row][col] = regionIndex format.
  let regions: number[][] | undefined
  if (data.regions?.length) {
    regions = Array.from({ length: size }, () => new Array(size).fill(-1) as number[])
    ;(data.regions as [number, number][][]).forEach((region, idx) => {
      region.forEach(([r, c]) => {
        if (r >= 0 && r < size && c >= 0 && c < size) {
          regions![r][c] = idx
        }
      })
    })
  }

  const constraints: PuzzleConstraint[] = [{ type: 'sudoku', data: { regions } }]

  // Killer cages: CTC cages with a numeric value become killer cages.
  // CTC cage cells are 0-indexed [row, col] → BoardIndex directly.
  const killerCages: { cells: BoardIndex[]; total?: number }[] = []
  for (const cage of (data.cages as CTCCage[]) ?? []) {
    if (!cage.cells?.length) continue
    const cageCells: BoardIndex[] = cage.cells.map(([r, c]) => [r, c] as BoardIndex)
    const raw = cage.value
    const total =
      typeof raw === 'number'
        ? raw
        : typeof raw === 'string'
          ? parseInt(raw) || undefined
          : undefined
    killerCages.push({ cells: cageCells, total })
  }
  if (killerCages.length > 0) {
    constraints.push({ type: 'killercage', data: { cages: killerCages } })
  }

  // Cosmetics: lines and overlays/underlays are rendered visually.
  // CTC uses corner-origin coordinates; convert with ctcCoord().
  const cosmeticLines: { points: [number, number][]; color: string; width: number }[] =
    []
  const cosmeticCircles: {
    center: [number, number]
    fillColor: string
    outlineColor: string
    radius: number
    value?: string
    fontColor?: string
  }[] = []
  const cosmeticTexts: {
    position: [number, number]
    value: string
    color: string
    size: number
  }[] = []

  // Grey lines are interpreted as palindrome constraints (see isPalindromeColor);
  // everything else is rendered as a cosmetic line.
  const palindromeLines: BoardIndex[][] = []

  for (const line of (data.lines as CTCLine[]) ?? []) {
    if (!line.wayPoints?.length) continue

    if (isPalindromeColor(line.color)) {
      // Map waypoints (cell centres) to board cells, dropping out-of-bounds
      // points and consecutive repeats.
      const cells: BoardIndex[] = []
      for (const [wr, wc] of line.wayPoints) {
        const cell = waypointToCell(wr, wc)
        if (cell[0] < 0 || cell[0] >= size || cell[1] < 0 || cell[1] >= size)
          continue
        const prev = cells[cells.length - 1]
        if (prev && prev[0] === cell[0] && prev[1] === cell[1]) continue
        cells.push(cell)
      }
      if (cells.length >= 2) {
        palindromeLines.push(cells)
        continue
      }
    }

    cosmeticLines.push({
      points: line.wayPoints.map(([r, c]) => ctcCoord(r, c)),
      color: line.color ?? '#000000',
      // CTC thickness is in pixels (default cellSize = 50px); normalize to cell fractions
      width: (line.thickness ?? 2) / 50,
    })
  }

  const allOverlays = [
    ...((data.underlays as CTCOverlay[]) ?? []),
    ...((data.overlays as CTCOverlay[]) ?? []),
  ]
  for (const overlay of allOverlays) {
    if (!overlay.center) continue
    const [r, c] = overlay.center
    const converted = ctcCoord(r, c)
    const hasText = overlay.text !== undefined && overlay.text !== ''
    const hasVisuals = overlay.backgroundColor || overlay.borderColor

    if (hasVisuals || hasText) {
      cosmeticCircles.push({
        center: converted,
        fillColor: overlay.backgroundColor ?? 'none',
        outlineColor: overlay.borderColor ?? 'none',
        radius: Math.max(overlay.width ?? 1, overlay.height ?? 1) * 0.5,
        value: hasText ? String(overlay.text) : undefined,
        fontColor: overlay.fontColor,
      })
    }
  }

  if (palindromeLines.length > 0) {
    constraints.push({ type: 'palindrome', data: { lines: palindromeLines } })
  }

  if (cosmeticLines.length > 0 || cosmeticCircles.length > 0 || cosmeticTexts.length > 0) {
    constraints.push({
      type: 'cosmetics',
      data: { lines: cosmeticLines, circles: cosmeticCircles, texts: cosmeticTexts },
    })
  }

  return {
    metadata: {
      title: data.title ?? (data.metadata as CTCMetadata | undefined)?.title,
      author: data.author ?? (data.metadata as CTCMetadata | undefined)?.author,
      ruleset: data.rules ?? (data.metadata as CTCMetadata | undefined)?.rules,
      source: 'ctc',
    },
    grid: { size, cells, regions },
    constraints,
  }
}

export const ctcFormat: PuzzleFormat = {
  name: 'ctc',
  detect(input: string): boolean {
    const s = input.trim()
    if (s.includes('sudokupad.app')) return true
    if ((s.startsWith('ctc') || s.startsWith('scl')) && s.length > 10) return true
    // Raw CTC JSON object
    if (s.startsWith('{')) {
      try {
        const parsed = JSON5.parse(s) as Record<string, unknown>
        // Distinguish CTC from FPuzzles: CTC has 'cells' as a 2D array (not grid)
        // and typically has 'regions' as array-of-groups, not per-cell numbers
        return 'cells' in parsed && !('grid' in parsed)
      } catch {
        return false
      }
    }
    return false
  },
  decode(input: string): PuzzleDefinition {
    return convertCTCToPuzzle(decodeCTC(input.trim()))
  },
}

// Internal CTC data types (not globally declared — only needed in this module)
interface CTCCell {
  value?: number | string
  cornermarks?: (number | string)[]
  centremarks?: (number | string)[]
  pencilMarks?: (number | string)[] | number | string
}

interface CTCCage {
  cells?: [number, number][]
  value?: number | string
  borderColor?: string
}

interface CTCLine {
  wayPoints: [number, number][]
  color: string
  thickness: number
}

interface CTCOverlay {
  center: [number, number]
  width?: number
  height?: number
  borderColor?: string
  backgroundColor?: string
  fontSize?: number
  fontColor?: string
  text?: string | number
}

interface CTCMetadata {
  title?: string
  author?: string
  rules?: string
}

interface CTCData {
  cellSize?: number
  cells?: unknown[][]
  regions?: unknown[][]
  cages?: unknown[]
  lines?: unknown[]
  arrows?: unknown[]
  underlays?: unknown[]
  overlays?: unknown[]
  title?: string
  author?: string
  rules?: string
  metadata?: unknown
}
