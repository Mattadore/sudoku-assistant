type XVData = { pairs: { cells: [BoardIndex, BoardIndex]; value: 'X' | 'V' }[] }

export default class XV implements SolverExtension {
  extensionName = 'xv'
  data: XVData = { pairs: [] }
  private cellPairs: { [index: string]: { other: BoardIndex; sum: number }[] } = {}

  isRelevant = (index: BoardIndex): boolean => {
    return `${index[0]},${index[1]}` in this.cellPairs
  }

  getCellConflicts = (board: BoardState, index: BoardIndex): number[][] => {
    const num = board[index[0]][index[1]].number
    if (!num) return []
    const key = `${index[0]},${index[1]}`
    const pairs = this.cellPairs[key]
    if (!pairs) return []
    const conflicts: number[][] = []
    for (const { other, sum } of pairs) {
      const required = sum - num
      const badNums: number[] = []
      for (let n = 1; n <= 9; n++) {
        if (n !== required) badNums.push(n)
      }
      conflicts.push([other[0], other[1], ...badNums])
    }
    return conflicts
  }

  getBoardOverlay = (_board: BoardState, cellSize: number): any => {
    if (this.data.pairs.length === 0) return null
    const { cellCenter, gridViewBox, overlayStyle } = require('./svgHelpers')
    const cc = (r: number, c: number) => cellCenter(r, c, cellSize)
    return (
      <svg style={overlayStyle()} viewBox={gridViewBox(cellSize)}>
        {this.data.pairs.map((pair, i) => {
          const a = cc(pair.cells[0][0], pair.cells[0][1])
          const b = cc(pair.cells[1][0], pair.cells[1][1])
          const mx = (a.x + b.x) / 2
          const my = (a.y + b.y) / 2
          return (
            <text key={i} x={mx} y={my} textAnchor="middle" dominantBaseline="central" fontSize={14} fontWeight="bold" fill="#333" opacity={0.8}>
              {pair.value}
            </text>
          )
        })}
      </svg>
    )
  }

  private updateMetadata = () => {
    this.cellPairs = {}
    for (const pair of this.data.pairs) {
      const sum = pair.value === 'X' ? 10 : 5
      const k0 = `${pair.cells[0][0]},${pair.cells[0][1]}`
      const k1 = `${pair.cells[1][0]},${pair.cells[1][1]}`
      if (!(k0 in this.cellPairs)) this.cellPairs[k0] = []
      if (!(k1 in this.cellPairs)) this.cellPairs[k1] = []
      this.cellPairs[k0].push({ other: pair.cells[1], sum })
      this.cellPairs[k1].push({ other: pair.cells[0], sum })
    }
  }

  loadPuzzleData = (data: XVData) => {
    this.data = data
    this.updateMetadata()
  }
}
