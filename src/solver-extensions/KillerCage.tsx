type CageData = { cages: { cells: BoardIndex[]; total?: number }[] }

export default class KillerCage implements SolverExtension {
  extensionName = 'killercage'
  data: CageData = { cages: [] }
  private cellCages: { [index: string]: number[] } = {}

  isRelevant = (index: BoardIndex): boolean => {
    return `${index[0]},${index[1]}` in this.cellCages
  }

  getCellConflicts = (board: BoardState, index: BoardIndex): number[][] => {
    const num = board[index[0]][index[1]].number
    if (!num) return []
    const key = `${index[0]},${index[1]}`
    const cageIndices = this.cellCages[key]
    if (!cageIndices) return []
    const conflicts: number[][] = []

    for (const ci of cageIndices) {
      const cage = this.data.cages[ci]
      const cellNums: { r: number; c: number; n: number }[] = []
      let allFilled = true

      for (const [r, c] of cage.cells) {
        const n = board[r][c].number
        if (!n) {
          allFilled = false
        } else {
          cellNums.push({ r, c, n })
        }
      }

      // No-repeat rule: always enforced (even if cage isn't full)
      for (const { r, c, n } of cellNums) {
        if (r === index[0] && c === index[1]) continue
        if (n === num) {
          // Duplicate found — both cells conflict on this number
          conflicts.push([r, c, num])
        }
      }

      // Sum rule: only check when all cells are filled and a total is defined
      if (allFilled && cage.total !== undefined) {
        const sum = cellNums.reduce((acc, { n }) => acc + n, 0)
        if (sum !== cage.total) {
          // Wrong sum — ALL cells (including self) conflict on their numbers
          for (const { r, c, n } of cellNums) {
            conflicts.push([r, c, n])
          }
        }
      }
    }
    return conflicts
  }

  getBoardOverlay = (_board: BoardState, cellSize: number): any => {
    if (this.data.cages.length === 0) return null
    const { cellCenter, gridViewBox, overlayStyle } = require('./svgHelpers')
    const inset = 3.5

    // Compute the top-left corner of a cell's inset box
    const cellTopLeft = (row: number, col: number) => {
      const center = cellCenter(row, col, cellSize)
      return {
        x: center.x - cellSize / 2 + inset,
        y: center.y - cellSize / 2 + inset,
      }
    }

    const cellBottomRight = (row: number, col: number) => {
      const tl = cellTopLeft(row, col)
      return { x: tl.x + cellSize - 2 * inset, y: tl.y + cellSize - 2 * inset }
    }

    return (
      <svg style={overlayStyle()} viewBox={gridViewBox(cellSize)}>
        {this.data.cages.map((cage, ci) => {
          const cellSet = new Set(cage.cells.map(([r, c]) => `${r},${c}`))
          const segments: { x1: number; y1: number; x2: number; y2: number }[] = []
          for (const [r, c] of cage.cells) {
            const tl = cellTopLeft(r, c)
            const br = cellBottomRight(r, c)
            if (!cellSet.has(`${r - 1},${c}`)) segments.push({ x1: tl.x, y1: tl.y, x2: br.x, y2: tl.y })
            if (!cellSet.has(`${r + 1},${c}`)) segments.push({ x1: tl.x, y1: br.y, x2: br.x, y2: br.y })
            if (!cellSet.has(`${r},${c - 1}`)) segments.push({ x1: tl.x, y1: tl.y, x2: tl.x, y2: br.y })
            if (!cellSet.has(`${r},${c + 1}`)) segments.push({ x1: br.x, y1: tl.y, x2: br.x, y2: br.y })
          }
          const firstTl = cellTopLeft(cage.cells[0][0], cage.cells[0][1])
          return (
            <g key={ci}>
              {segments.map((s, si) => (
                <line
                  key={si}
                  x1={s.x1}
                  y1={s.y1}
                  x2={s.x2}
                  y2={s.y2}
                  stroke="#111111"
                  strokeWidth={1}
                  strokeDasharray="5 3"
                />
              ))}
              {cage.total !== undefined && (
                <text
                  x={firstTl.x + 1}
                  y={firstTl.y + 11}
                  fontSize={10}
                  fontWeight="bold"
                  fill="#111111"
                >
                  {cage.total}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    )
  }

  private updateMetadata = () => {
    this.cellCages = {}
    for (let ci = 0; ci < this.data.cages.length; ci++) {
      for (const [r, c] of this.data.cages[ci].cells) {
        const key = `${r},${c}`
        if (!(key in this.cellCages)) this.cellCages[key] = []
        this.cellCages[key].push(ci)
      }
    }
  }

  loadPuzzleData = (data: CageData) => {
    this.data = data
    this.updateMetadata()
  }
}
