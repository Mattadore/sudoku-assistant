import { cellCenter, gridViewBox, overlayStyle } from './svgHelpers'

type LineData = { lines: BoardIndex[][] }

export default class Renban implements SolverExtension {
  extensionName = 'renban'
  data: BoardIndex[][] = []
  private cellLines: { [index: string]: number[] } = {}

  isRelevant = (index: BoardIndex): boolean => {
    return `${index[0]},${index[1]}` in this.cellLines
  }

  getCellConflicts = (board: BoardState, index: BoardIndex): number[][] => {
    const num = board[index[0]][index[1]].number
    if (!num) return []
    const key = `${index[0]},${index[1]}`
    const lineIndices = this.cellLines[key]
    if (!lineIndices) return []
    const conflicts: number[][] = []
    // No repeats on any renban line this cell belongs to
    for (const li of lineIndices) {
      for (const [r, c] of this.data[li]) {
        if (r === index[0] && c === index[1]) continue
        conflicts.push([r, c, num])
      }
    }
    return conflicts
  }

  serializeConstraints = (_rows: number, cols: number): SolverConstraint[] => {
    return this.data.map((line) => ({
      type: 'renban' as const,
      cells: line.map(([r, c]) => r * cols + c),
    }))
  }

  getBoardOverlay = (_board: BoardState, cellSize: number): any => {
    if (this.data.length === 0) return null
    const cc = (r: number, c: number) => cellCenter(r, c, cellSize)
    const lineWidth = cellSize * 0.2
    return (
      <svg style={overlayStyle()} viewBox={gridViewBox(cellSize, _board.length, _board[0].length)}>
        {this.data.map((line, i) => {
          const points = line.map(([r, c]) => { const p = cc(r, c); return `${p.x},${p.y}` }).join(' ')
          return <polyline key={i} points={points} fill="none" stroke="#BB44BB" strokeWidth={lineWidth} strokeLinecap="round" strokeLinejoin="round" opacity={0.5} />
        })}
      </svg>
    )
  }

  private updateMetadata = () => {
    this.cellLines = {}
    for (let li = 0; li < this.data.length; li++) {
      for (const [r, c] of this.data[li]) {
        const key = `${r},${c}`
        if (!(key in this.cellLines)) this.cellLines[key] = []
        this.cellLines[key].push(li)
      }
    }
  }

  loadPuzzleData = (data: LineData) => {
    this.data = data.lines
    this.updateMetadata()
  }
}
