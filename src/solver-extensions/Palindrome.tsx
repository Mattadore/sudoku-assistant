type LineData = { lines: BoardIndex[][] }

export default class Palindrome implements SolverExtension {
  extensionName = 'palindrome'
  data: BoardIndex[][] = []
  private cellLines: { [index: string]: { line: number; position: number }[] } = {}

  isRelevant = (index: BoardIndex): boolean => {
    return `${index[0]},${index[1]}` in this.cellLines
  }

  getCellConflicts = (board: BoardState, index: BoardIndex): number[][] => {
    const num = board[index[0]][index[1]].number
    if (!num) return []
    const key = `${index[0]},${index[1]}`
    const memberships = this.cellLines[key]
    if (!memberships) return []
    const conflicts: number[][] = []
    for (const { line, position } of memberships) {
      const path = this.data[line]
      const mirrorPos = path.length - 1 - position
      if (mirrorPos === position) continue
      const [mr, mc] = path[mirrorPos]
      // Mirror cell must have the same number — all other numbers conflict
      const badNums: number[] = []
      for (let n = 1; n <= 9; n++) {
        if (n !== num) badNums.push(n)
      }
      conflicts.push([mr, mc, ...badNums])
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
          return <polyline key={i} points={points} fill="none" stroke="#AAAAAA" strokeWidth={lineWidth} strokeLinecap="round" strokeLinejoin="round" opacity={0.5} />
        })}
      </svg>
    )
  }

  private updateMetadata = () => {
    this.cellLines = {}
    for (let li = 0; li < this.data.length; li++) {
      for (let pos = 0; pos < this.data[li].length; pos++) {
        const [r, c] = this.data[li][pos]
        const key = `${r},${c}`
        if (!(key in this.cellLines)) this.cellLines[key] = []
        this.cellLines[key].push({ line: li, position: pos })
      }
    }
  }

  loadPuzzleData = (data: LineData) => {
    this.data = data.lines
    this.updateMetadata()
  }
}
