type PairData = { pairs: { cells: [BoardIndex, BoardIndex]; value?: number }[] }

export default class Ratio implements SolverExtension {
  extensionName = 'ratio'
  data: PairData = { pairs: [] }
  private cellPairs: { [index: string]: { other: BoardIndex; value: number }[] } = {}

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
    for (const { other, value } of pairs) {
      const badNums: number[] = []
      for (let n = 1; n <= 9; n++) {
        // Valid if n * value === num OR n === num * value
        if (n * value !== num && n !== num * value) badNums.push(n)
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
          return <circle key={i} cx={mx} cy={my} r={8} fill="#333" stroke="#333" strokeWidth={1.5} opacity={0.8} />
        })}
      </svg>
    )
  }

  private updateMetadata = () => {
    this.cellPairs = {}
    for (const pair of this.data.pairs) {
      const val = pair.value ?? 2
      const k0 = `${pair.cells[0][0]},${pair.cells[0][1]}`
      const k1 = `${pair.cells[1][0]},${pair.cells[1][1]}`
      if (!(k0 in this.cellPairs)) this.cellPairs[k0] = []
      if (!(k1 in this.cellPairs)) this.cellPairs[k1] = []
      this.cellPairs[k0].push({ other: pair.cells[1], value: val })
      this.cellPairs[k1].push({ other: pair.cells[0], value: val })
    }
  }

  loadPuzzleData = (data: PairData) => {
    this.data = data
    this.updateMetadata()
  }
}
