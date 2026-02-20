// Shared SVG coordinate helpers for extension overlays

export const CELL_GAP = 1

export function cellCenter(
  row: number,
  col: number,
  cellSize: number,
): { x: number; y: number } {
  return {
    x: col * (cellSize + CELL_GAP) + cellSize / 2 + CELL_GAP,
    y: row * (cellSize + CELL_GAP) + cellSize / 2 + CELL_GAP,
  }
}

// ViewBox covering exactly the cell area (used for inner board overlays)
export function gridViewBox(
  cellSize: number,
  rows = 9,
  cols = 9,
): string {
  const totalW = cols * (cellSize + CELL_GAP) + CELL_GAP
  const totalH = rows * (cellSize + CELL_GAP) + CELL_GAP
  return `0 0 ${totalW} ${totalH}`
}

// ViewBox extending one cell stride outside the grid on each side (for outer clues).
// Uses negative origin so cellCenter coordinates are the same in both inner and outer views.
export function outerViewBox(
  cellSize: number,
  rows = 9,
  cols = 9,
): string {
  const stride = cellSize + CELL_GAP
  const innerW = cols * stride + CELL_GAP
  const innerH = rows * stride + CELL_GAP
  return `${-stride} ${-stride} ${innerW + 2 * stride} ${innerH + 2 * stride}`
}

export function cellRect(
  row: number,
  col: number,
  cellSize: number,
): { x: number; y: number; w: number; h: number } {
  return {
    x: col * (cellSize + CELL_GAP) + CELL_GAP,
    y: row * (cellSize + CELL_GAP) + CELL_GAP,
    w: cellSize,
    h: cellSize,
  }
}

export function underlayStyle(): React.CSSProperties {
  return {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 212,
  }
}

export function overlayStyle(): React.CSSProperties {
  return {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 215,
  }
}
