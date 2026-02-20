type LineData = { lines: BoardIndex[][] }

export default class Whispers implements SolverExtension {
  extensionName = 'whispers'
  data: BoardIndex[][] = []
  // Maps cell -> list of adjacent cells on whisper lines
  private cellNeighbors: { [index: string]: string[] } = {}

  isRelevant = (index: BoardIndex): boolean => {
    return `${index[0]},${index[1]}` in this.cellNeighbors
  }

  getCellConflicts = (board: BoardState, index: BoardIndex): number[][] => {
    const num = board[index[0]][index[1]].number
    if (!num) return []
    const key = `${index[0]},${index[1]}`
    const neighbors = this.cellNeighbors[key]
    if (!neighbors) return []
    const conflicts: number[][] = []
    // Adjacent cells on whisper line must differ by >= 5
    // So they conflict on numbers within 4 of num
    const badNums: number[] = []
    for (let n = 1; n <= 9; n++) {
      if (Math.abs(n - num) < 5) badNums.push(n)
    }
    for (const nKey of neighbors) {
      const [r, c] = nKey.split(',').map(Number)
      conflicts.push([r, c, ...badNums])
    }
    return conflicts
  }

  getBoardOverlay = (_board: BoardState, cellSize: number): any => {
    if (this.data.length === 0) return null
    const { cellCenter, gridViewBox, overlayStyle } = require('./svgHelpers')
    const cc = (r: number, c: number) => cellCenter(r, c, cellSize)
    const lineWidth = cellSize * 0.2
    return (
      <svg style={overlayStyle()} viewBox={gridViewBox(cellSize)}>
        {this.data.map((line, i) => {
          const points = line.map(([r, c]) => { const p = cc(r, c); return `${p.x},${p.y}` }).join(' ')
          return <polyline key={i} points={points} fill="none" stroke="#44BB44" strokeWidth={lineWidth} strokeLinecap="round" strokeLinejoin="round" opacity={0.5} />
        })}
      </svg>
    )
  }

  private updateMetadata = () => {
    this.cellNeighbors = {}
    for (const line of this.data) {
      for (let i = 0; i < line.length; i++) {
        const key = `${line[i][0]},${line[i][1]}`
        if (!(key in this.cellNeighbors)) this.cellNeighbors[key] = []
        if (i > 0) this.cellNeighbors[key].push(`${line[i - 1][0]},${line[i - 1][1]}`)
        if (i < line.length - 1) this.cellNeighbors[key].push(`${line[i + 1][0]},${line[i + 1][1]}`)
      }
    }
  }

  loadPuzzleData = (data: LineData) => {
    this.data = data.lines
    this.updateMetadata()
  }
}
