import { compressor } from 'external'
import { computeDefaultRegions } from '../stores/gameStore'

function parseFPuzzleCell(ref: string): BoardIndex {
  const match = ref.match(/R(\d+)C(\d+)/)
  if (!match) throw new Error(`Invalid cell reference: ${ref}`)
  return [parseInt(match[1]) - 1, parseInt(match[2]) - 1]
}

// Cosmetic elements can use fractional positions like "R1.5C2.5"
function parseFPuzzleCellFractional(ref: string): [number, number] {
  const match = ref.match(/R([\d.]+)C([\d.]+)/)
  if (!match) throw new Error(`Invalid cell reference: ${ref}`)
  return [parseFloat(match[1]) - 1, parseFloat(match[2]) - 1]
}

export function convertFPuzzleToPuzzle(fpuzzle: FPuzzleData): PuzzleDefinition {
  const size = fpuzzle.size
  const cells: PuzzleCell[][] = []
  for (let row = 0; row < size; row++) {
    cells.push([])
    for (let col = 0; col < size; col++) {
      const fpCell = fpuzzle.grid[row]?.[col]
      const cell: PuzzleCell = {}
      if (fpCell?.given && fpCell?.value) cell.given = fpCell.value
      if (fpCell?.c) cell.color = fpCell.c
      cells[row].push(cell)
    }
  }

  // Custom regions — cells with an explicit region override leave their default
  // box, but cells without one stay in their original box region.
  let regions: number[][] | undefined
  if (fpuzzle.grid.some((row) => row.some((cell) => cell.region !== undefined))) {
    const defaults = computeDefaultRegions(size, size)
    regions = fpuzzle.grid.map((row, r) =>
      row.map((cell, c) => cell.region ?? defaults[r][c]),
    )
  }

  const constraints: PuzzleConstraint[] = [
    { type: 'sudoku', data: { regions } },
  ]

  // Thermometers
  if (fpuzzle.thermometer?.length) {
    constraints.push({
      type: 'thermometer',
      data: { lines: fpuzzle.thermometer.map((t) => t.lines[0].map(parseFPuzzleCell)) },
    })
  }

  // Killer cages
  if (fpuzzle.killercage?.length) {
    constraints.push({
      type: 'killercage',
      data: {
        cages: fpuzzle.killercage.map((cage) => ({
          cells: cage.cells.map(parseFPuzzleCell),
          total: cage.value ? parseInt(cage.value) : undefined,
        })),
      },
    })
  }

  // Arrow
  if (fpuzzle.arrow?.length) {
    constraints.push({
      type: 'arrow',
      data: {
        arrows: fpuzzle.arrow.map((a: any) => ({
          circle: (a.cells || []).map(parseFPuzzleCell),
          line: (a.lines || []).map((line: string[]) => line.map(parseFPuzzleCell)),
        })),
      },
    })
  }

  // Boolean constraints
  if (fpuzzle.antiknight) constraints.push({ type: 'antiknight' })
  if (fpuzzle.antiking) constraints.push({ type: 'antiking' })
  if (fpuzzle['diagonal+']) constraints.push({ type: 'diagonal+' })
  if (fpuzzle['diagonal-']) constraints.push({ type: 'diagonal-' })
  if (fpuzzle.nonconsecutive) constraints.push({ type: 'nonconsecutive' })
  if (fpuzzle.disjointgroups) constraints.push({ type: 'disjointgroups' })

  // Line-based constraints
  const lineTypes = ['palindrome', 'renban', 'whispers', 'betweenline'] as const
  for (const type of lineTypes) {
    const lineData = fpuzzle[type] as FPuzzleLineConstraint[] | undefined
    if (lineData?.length) {
      constraints.push({
        type,
        data: { lines: lineData.map((c) => c.lines[0].map(parseFPuzzleCell)) },
      })
    }
  }

  // Border constraints (difference, ratio, xv)
  if (fpuzzle.difference?.length) {
    constraints.push({
      type: 'difference',
      data: {
        pairs: fpuzzle.difference.map((d: any) => ({
          cells: d.cells.map(parseFPuzzleCell) as [BoardIndex, BoardIndex],
          value: d.value ? parseInt(d.value) : undefined,
        })),
      },
    })
  }
  if (fpuzzle.ratio?.length) {
    constraints.push({
      type: 'ratio',
      data: {
        pairs: fpuzzle.ratio.map((r: any) => ({
          cells: r.cells.map(parseFPuzzleCell) as [BoardIndex, BoardIndex],
          value: r.value ? parseInt(r.value) : undefined,
        })),
      },
    })
  }
  if (fpuzzle.xv?.length) {
    constraints.push({
      type: 'xv',
      data: {
        pairs: fpuzzle.xv.map((x: any) => ({
          cells: x.cells.map(parseFPuzzleCell) as [BoardIndex, BoardIndex],
          value: x.value || 'X',
        })),
      },
    })
  }

  // Cell markers (odd, even, min, max)
  for (const type of ['odd', 'even', 'minimum', 'maximum'] as const) {
    const markers = fpuzzle[type] as { cell: string }[] | undefined
    if (markers?.length) {
      constraints.push({
        type,
        data: { cells: markers.map((m) => parseFPuzzleCell(m.cell)) },
      })
    }
  }

  // Cosmetic elements (lines, circles, text)
  const cosmeticLines: any[] = []
  const cosmeticCircles: any[] = []
  const cosmeticTexts: any[] = []

  if (fpuzzle.line?.length) {
    for (const line of fpuzzle.line as any[]) {
      for (const linePoints of line.lines || []) {
        cosmeticLines.push({
          points: linePoints.map(parseFPuzzleCellFractional),
          color: line.outlineC || '#000000',
          width: line.width ?? 2,
        })
      }
    }
  }

  if (fpuzzle.circle?.length) {
    for (const c of fpuzzle.circle as any[]) {
      if (!c.cells?.length) continue
      // Average cell positions to find center
      const positions = c.cells.map(parseFPuzzleCellFractional)
      const avgRow =
        positions.reduce((s: number, p: [number, number]) => s + p[0], 0) /
        positions.length
      const avgCol =
        positions.reduce((s: number, p: [number, number]) => s + p[1], 0) /
        positions.length
      cosmeticCircles.push({
        center: [avgRow, avgCol] as [number, number],
        fillColor: c.baseC || 'none',
        outlineColor: c.outlineC || '#000000',
        radius: c.width ?? 0.5,
        value: c.value || undefined,
        fontColor: c.fontC || undefined,
      })
    }
  }

  if (fpuzzle.text?.length) {
    for (const t of fpuzzle.text as any[]) {
      if (!t.cells?.length || !t.value) continue
      // Average the cell positions to find placement center
      const positions = t.cells.map(parseFPuzzleCellFractional)
      const avgRow =
        positions.reduce((s: number, p: [number, number]) => s + p[0], 0) /
        positions.length
      const avgCol =
        positions.reduce((s: number, p: [number, number]) => s + p[1], 0) /
        positions.length
      cosmeticTexts.push({
        position: [avgRow, avgCol],
        value: t.value,
        color: t.fontC || '#000000',
        size: t.size ?? 1,
      })
    }
  }

  if (
    cosmeticLines.length > 0 ||
    cosmeticCircles.length > 0 ||
    cosmeticTexts.length > 0
  ) {
    constraints.push({
      type: 'cosmetics',
      data: {
        lines: cosmeticLines,
        circles: cosmeticCircles,
        texts: cosmeticTexts,
      },
    })
  }

  return {
    metadata: {
      title: fpuzzle.title,
      author: fpuzzle.author,
      ruleset: fpuzzle.ruleset,
      source: 'fpuzzles',
    },
    grid: { size, cells, regions },
    constraints,
  }
}

export function decodeFPuzzle(input: string): FPuzzleData {
  let base64 = input
  if (input.includes('?load=')) base64 = input.split('?load=')[1]
  const json = compressor.decompressFromBase64(base64)
  if (!json) throw new Error('Failed to decompress puzzle data')
  return JSON.parse(json) as FPuzzleData
}

export const fpuzzlesFormat: PuzzleFormat = {
  name: 'fpuzzles',
  detect(input: string): boolean {
    const s = input.trim()
    if (s.includes('f-puzzles.com') || s.includes('?load=')) return true
    // Bare LZ-string base64 — no ctc/scl prefix
    return (
      /^[A-Za-z0-9+/=]{20,}$/.test(s) &&
      !s.startsWith('ctc') &&
      !s.startsWith('scl')
    )
  },
  decode(input: string): PuzzleDefinition {
    return convertFPuzzleToPuzzle(decodeFPuzzle(input.trim()))
  },
}
