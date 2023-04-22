// [thermo#][segment#][1: row, 2: col]
type ThermoData = number[][][]

type FpuzzleThermoData = {
  lines: string[][]
}[]

type ThermoIndexMap = {
  [key: string]: number[]
}

export default class Thermometer implements SolverExtension {
  extensionName = 'thermometer'
  data: ThermoData = []
  indexMap: ThermoIndexMap = {}
  getBoardConflicts = (board: BoardState) => {
    let conflicts: ConflictList = {}
    for (let thermo of this.data) {
      let lastValue: number | null = null
      for (let segment of thermo) {
        const currentValue = board[segment[0]][segment[1]].number
        if (lastValue && currentValue && lastValue >= currentValue) {
          conflicts[segment[0] + ',' + segment[1]] = true
        }
        lastValue = currentValue
      }
    }
    return conflicts
  }

  getCellConflict = (board: BoardState, row: number, column: number) => {
    for (let thermoIndex of this.indexMap[row + ',' + column]) {
      const thermo = this.data[thermoIndex]
      let lastValue: number | null = null
      for (let segment of thermo) {
        const currentValue = board[segment[0]][segment[1]].number
        // if it's the cell we're checking
        if (segment[0] === row && segment[1] === column) {
          if (lastValue && currentValue && lastValue >= currentValue) {
            return true
          }
        }
        lastValue = currentValue
      }
    }
    return false
  }
  // drawCell = (board: BoardState, config: SolverExtensionConfig, listIndex: number, cellIndex: number) =>  {

  // }
  loadFpuzzleData = (loadedData: FpuzzleThermoData) => {
    for (let thermo of loadedData) {
      this.data.push([])
      for (let cell of thermo.lines[0]) {
        const [row, column] = cell
          .slice(1)
          .split('C')
          .map((i) => parseInt(i))
        this.data[this.data.length - 1].push([row, column])
        const index = row + ',' + column
        // track the thermos associated with a cell in the index map
        if (!(index in this.indexMap)) {
          this.indexMap[index] = []
        }
        this.indexMap[index].push(this.data.length - 1)
      }
    }
  }
}
