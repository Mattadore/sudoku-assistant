import { computeDefaultRegions } from '../stores/gameStore'
import { cellCenter, gridViewBox, overlayStyle } from './svgHelpers'

export default class Sudoku implements SolverExtension {
  extensionName = 'sudoku'
  private regions: number[][] | null = null
  // Map from region id to list of cell positions in that region
  private regionCells: Map<number, BoardIndex[]> = new Map()
  // cellRegion[row][col] = region id
  private cellRegion: number[][] = []

  loadPuzzleData = (data: { regions?: number[][] }) => {
    if (data?.regions) {
      this.setRegions(data.regions)
    }
  }

  private setRegions(regions: number[][]) {
    this.regions = regions
    this.cellRegion = regions
    this.regionCells = new Map()
    for (let r = 0; r < regions.length; r++) {
      for (let c = 0; c < regions[r].length; c++) {
        const regionId = regions[r][c]
        if (!this.regionCells.has(regionId)) {
          this.regionCells.set(regionId, [])
        }
        this.regionCells.get(regionId)!.push([r, c])
      }
    }
  }

  private ensureRegions(board: BoardState) {
    if (!this.regions) {
      const rows = board.length
      const cols = board[0]?.length ?? 0
      this.setRegions(computeDefaultRegions(rows, cols))
    }
  }

  getCellConflicts = (board: BoardState, index: BoardIndex): number[][] => {
    const num = board[index[0]][index[1]].number
    if (!num) return []

    this.ensureRegions(board)

    const numRows = board.length
    const numCols = board[0].length
    const conflicts: [number, number, number][] = []

    // Row conflicts
    for (let col = 0; col < numCols; ++col) {
      if (col !== index[1]) {
        conflicts.push([index[0], col, num])
      }
    }

    // Column conflicts
    for (let row = 0; row < numRows; ++row) {
      if (row !== index[0]) {
        conflicts.push([row, index[1], num])
      }
    }

    // Region conflicts (skip cells already covered by row/col)
    const regionId = this.cellRegion[index[0]]?.[index[1]]
    if (regionId !== undefined) {
      const cells = this.regionCells.get(regionId)
      if (cells) {
        for (const [r, c] of cells) {
          if (r === index[0] || c === index[1]) continue
          conflicts.push([r, c, num])
        }
      }
    }

    return conflicts
  }

  serializeConstraints = (rows: number, cols: number): SolverConstraint[] => {
    if (!this.regions) this.setRegions(computeDefaultRegions(rows, cols))
    const flat = (r: number, c: number) => r * cols + c
    const constraints: SolverConstraint[] = []
    for (let r = 0; r < rows; r++) {
      constraints.push({ type: 'unique_group', cells: Array.from({ length: cols }, (_, c) => flat(r, c)) })
    }
    for (let c = 0; c < cols; c++) {
      constraints.push({ type: 'unique_group', cells: Array.from({ length: rows }, (_, r) => flat(r, c)) })
    }
    for (const [, cells] of this.regionCells) {
      constraints.push({ type: 'unique_group', cells: cells.map(([r, c]) => flat(r, c)) })
    }
    return constraints
  }

  getBoardOverlay = (_board: BoardState, cellSize: number): any => {
    this.ensureRegions(_board)
    if (!this.regions) return null

    const rows = this.regions.length
    const cols = this.regions[0]?.length ?? 0
    const segments: { x1: number; y1: number; x2: number; y2: number }[] = []

    // For each pair of horizontally/vertically adjacent cells in different regions,
    // draw a thick line segment at their shared boundary.
    // Extend each segment by 1 on each end to cover the cell gap and overlap at corners.
    const ext = 1
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const regionId = this.regions[r][c]
        const center = cellCenter(r, c, cellSize)
        const half = cellSize / 2

        // Right neighbor
        if (c + 1 < cols && this.regions[r][c + 1] !== regionId) {
          const midX = center.x + half + 0.5 // 0.5 for cell gap center
          segments.push({
            x1: midX,
            y1: center.y - half - ext,
            x2: midX,
            y2: center.y + half + ext,
          })
        }

        // Bottom neighbor
        if (r + 1 < rows && this.regions[r + 1][c] !== regionId) {
          const midY = center.y + half + 0.5
          segments.push({
            x1: center.x - half - ext,
            y1: midY,
            x2: center.x + half + ext,
            y2: midY,
          })
        }
      }
    }

    // Outer border
    const topLeft = cellCenter(0, 0, cellSize)
    const bottomRight = cellCenter(rows - 1, cols - 1, cellSize)
    const half = cellSize / 2
    const borderX1 = topLeft.x - half
    const borderY1 = topLeft.y - half
    const borderX2 = bottomRight.x + half
    const borderY2 = bottomRight.y + half

    return (
      <svg
        style={overlayStyle()}
        viewBox={gridViewBox(cellSize, rows, cols)}
      >
        <rect
          x={borderX1}
          y={borderY1}
          width={borderX2 - borderX1}
          height={borderY2 - borderY1}
          fill="none"
          stroke="#333333"
          strokeWidth={3}
        />
        {segments.map((s, i) => (
          <line
            key={i}
            x1={s.x1}
            y1={s.y1}
            x2={s.x2}
            y2={s.y2}
            stroke="#333333"
            strokeWidth={3}
          />
        ))}
      </svg>
    )
  }
}
