// Shared SVG coordinate helpers for extension overlays

const BOX_GAP = 3
const CELL_GAP = 1

export function cellCenter(
  row: number,
  col: number,
  cellSize: number,
): { x: number; y: number } {
  const boxGapsX = Math.floor(col / 3) * (BOX_GAP - CELL_GAP)
  const boxGapsY = Math.floor(row / 3) * (BOX_GAP - CELL_GAP)
  return {
    x: col * (cellSize + CELL_GAP) + cellSize / 2 + boxGapsX + BOX_GAP,
    y: row * (cellSize + CELL_GAP) + cellSize / 2 + boxGapsY + BOX_GAP,
  }
}

export function gridViewBox(cellSize: number, gridSize = 9): string {
  const totalGaps =
    gridSize * (cellSize + CELL_GAP) +
    Math.floor(gridSize / 3) * (BOX_GAP - CELL_GAP) +
    2 * BOX_GAP
  return `0 0 ${totalGaps} ${totalGaps}`
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
