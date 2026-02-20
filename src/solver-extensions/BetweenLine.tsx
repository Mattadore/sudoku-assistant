type LineData = { lines: BoardIndex[][] }

export default class BetweenLine implements SolverExtension {
  extensionName = 'betweenline'
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
      const isEndpoint = position === 0 || position === path.length - 1
      if (isEndpoint) {
        // Endpoint: middle cells must be strictly between the two endpoints
        const otherEndPos = position === 0 ? path.length - 1 : 0
        const [oR, oC] = path[otherEndPos]
        const otherNum = board[oR][oC].number
        if (otherNum) {
          const lo = Math.min(num, otherNum)
          const hi = Math.max(num, otherNum)
          // Middle cells conflict on numbers <= lo and >= hi
          for (let i = 1; i < path.length - 1; i++) {
            const [mR, mC] = path[i]
            const badNums: number[] = []
            for (let n = 1; n <= lo; n++) badNums.push(n)
            for (let n = hi; n <= 9; n++) badNums.push(n)
            if (badNums.length > 0) conflicts.push([mR, mC, ...badNums])
          }
        }
      } else {
        // Middle cell: must be between endpoints. Constrain endpoints.
        const [e1R, e1C] = path[0]
        const [e2R, e2C] = path[path.length - 1]
        // Endpoints can't equal this number (must bracket it)
        conflicts.push([e1R, e1C, num])
        conflicts.push([e2R, e2C, num])
      }
    }
    return conflicts
  }

  getBoardOverlay = (_board: BoardState, cellSize: number): any => {
    if (this.data.length === 0) return null
    const { cellCenter, gridViewBox, overlayStyle } = require('./svgHelpers')
    const cc = (r: number, c: number) => cellCenter(r, c, cellSize)
    const lineWidth = cellSize * 0.15
    const dotRadius = cellSize * 0.2
    return (
      <svg style={overlayStyle()} viewBox={gridViewBox(cellSize)}>
        {this.data.map((line, i) => {
          const points = line.map(([r, c]) => { const p = cc(r, c); return `${p.x},${p.y}` }).join(' ')
          const start = cc(line[0][0], line[0][1])
          const end = cc(line[line.length - 1][0], line[line.length - 1][1])
          return (
            <g key={i}>
              <polyline points={points} fill="none" stroke="#AAAAAA" strokeWidth={lineWidth} strokeLinecap="round" strokeLinejoin="round" opacity={0.5} />
              <circle cx={start.x} cy={start.y} r={dotRadius} fill="none" stroke="#AAAAAA" strokeWidth={2} opacity={0.5} />
              <circle cx={end.x} cy={end.y} r={dotRadius} fill="none" stroke="#AAAAAA" strokeWidth={2} opacity={0.5} />
            </g>
          )
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
