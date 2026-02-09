// [thermo#][segment#] = [row, col]
type ThermoData = BoardIndex[][]

type FpuzzleThermoData = {
  lines: string[][]
}[]

export default class Thermometer implements SolverExtension {
  extensionName = 'thermometer'
  data: ThermoData = []
  // Maps cell string index -> list of { thermoIdx, positionInThermo }
  cellThermos: { [index: string]: { thermo: number; position: number }[] } = {}

  isRelevant = (index: BoardIndex) => {
    const key = `${index[0]},${index[1]}`
    return key in this.cellThermos
  }

  getCellConflicts = (board: BoardState, index: BoardIndex): number[][] => {
    const key = `${index[0]},${index[1]}`
    const num = board[index[0]][index[1]].number
    if (!num) return []

    const memberships = this.cellThermos[key]
    if (!memberships) return []

    const conflicts: number[][] = []

    for (const { thermo, position } of memberships) {
      const thermoPath = this.data[thermo]

      // Predecessor cells (must have strictly smaller numbers)
      for (let j = 0; j < position; j++) {
        const [pRow, pCol] = thermoPath[j]
        // Numbers >= num in a predecessor cell violate the constraint
        const badNums: number[] = []
        for (let n = num; n <= 9; n++) badNums.push(n)
        conflicts.push([pRow, pCol, ...badNums])
      }

      // Successor cells (must have strictly larger numbers)
      for (let k = position + 1; k < thermoPath.length; k++) {
        const [sRow, sCol] = thermoPath[k]
        // Numbers <= num in a successor cell violate the constraint
        const badNums: number[] = []
        for (let n = 1; n <= num; n++) badNums.push(n)
        conflicts.push([sRow, sCol, ...badNums])
      }
    }

    return conflicts
  }

  getBoardOverlay = (_board: BoardState, cellSize: number): any => {
    if (this.data.length === 0) return null

    const gap = 3 // grid gap in px (matches box gap)
    const cellGap = 1

    // Convert cell index to pixel center
    const cellCenter = (row: number, col: number) => {
      const boxGapsX = Math.floor(col / 3) * (gap - cellGap)
      const boxGapsY = Math.floor(row / 3) * (gap - cellGap)
      const x = col * (cellSize + cellGap) + cellSize / 2 + boxGapsX + gap
      const y = row * (cellSize + cellGap) + cellSize / 2 + boxGapsY + gap
      return { x, y }
    }

    const bulbRadius = cellSize * 0.3
    const lineWidth = cellSize * 0.2

    return (
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 100,
        }}
      >
        {this.data.map((thermo, i) => {
          if (thermo.length === 0) return null
          const [bulbRow, bulbCol] = thermo[0]
          const bulb = cellCenter(bulbRow, bulbCol)
          const points = thermo
            .map(([r, c]) => {
              const { x, y } = cellCenter(r, c)
              return `${x},${y}`
            })
            .join(' ')

          return (
            <g key={i}>
              <polyline
                points={points}
                fill="none"
                stroke="#AAAAAA"
                strokeWidth={lineWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.6}
              />
              <circle
                cx={bulb.x}
                cy={bulb.y}
                r={bulbRadius}
                fill="#AAAAAA"
                opacity={0.6}
              />
            </g>
          )
        })}
      </svg>
    )
  }

  updateMetadata = () => {
    this.cellThermos = {}
    for (let thermoIdx = 0; thermoIdx < this.data.length; thermoIdx++) {
      const thermo = this.data[thermoIdx]
      for (let pos = 0; pos < thermo.length; pos++) {
        const [row, col] = thermo[pos]
        const key = `${row},${col}`
        if (!(key in this.cellThermos)) {
          this.cellThermos[key] = []
        }
        this.cellThermos[key].push({ thermo: thermoIdx, position: pos })
      }
    }
  }

  loadPuzzleData = (data: { lines: BoardIndex[][] }) => {
    this.data = data.lines
    this.updateMetadata()
  }

  loadFpuzzleData = (loadedData: FpuzzleThermoData) => {
    for (const thermo of loadedData) {
      const path: BoardIndex[] = []
      for (const cell of thermo.lines[0]) {
        // FPuzzles format: "R1C1" is 1-indexed, convert to 0-indexed
        const [row, column] = cell
          .slice(1)
          .split('C')
          .map((i) => parseInt(i) - 1)
        path.push([row, column])
      }
      this.data.push(path)
    }
    this.updateMetadata()
  }
}
