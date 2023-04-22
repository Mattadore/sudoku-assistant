// [thermo#][segment#][1: row, 2: col]
type ThermoData = number[][][]

type FpuzzleThermoData = {
  lines: string[][]
}[]

type ThermoIndexMap = {
  [key: string]: string[]
}

import { splitIndex } from 'helper'

export default class Thermometer implements SolverExtension {
  extensionName = 'thermometer'
  data: ThermoData = []
  // track each cell in each thermo before other cells for efficient incremental update
  prevCellMap: ThermoIndexMap = {}
  getBoardConflicts = (board: BoardState) => {
    let conflicts: ConflictList = {}
    for (let thermo of this.data) {
      let prevValue: number | null = null
      for (let segment of thermo) {
        const [row, column] = segment
        const currentValue = board[row][column].number
        if (prevValue && currentValue && prevValue >= currentValue) {
          conflicts[row + ',' + column] = true
        }
        prevValue = currentValue
      }
    }
    return conflicts
  }

  getCellConflict = (board: BoardState, row: number, column: number) => {
    let cellValue = board[row][column].number
    const index = row + ',' + column
    if (!cellValue || !(index in this.prevCellMap)) return false
    for (let prevCell of this.prevCellMap[index]) {
      const [prevRow, prevColumn] = splitIndex(prevCell)
      let prevValue = board[prevRow][prevColumn].number
      if (prevValue !== null && prevValue >= cellValue) {
        return true
      }
    }
    return false
  }

  updateMetadata = () => {
    this.prevCellMap = {}
    for (let thermo of this.data) {
      let lastIndex: string | null = null
      for (let segment of thermo) {
        const [row, column] = segment
        const index = row + ',' + column
        // track the previous cell for each thermos associated with this cell
        if (!(index in this.prevCellMap)) {
          this.prevCellMap[index] = []
        }
        if (lastIndex !== null) {
          this.prevCellMap[index].push(lastIndex)
        }
        lastIndex = index
      }
    }
  }

  loadFpuzzleData = (loadedData: FpuzzleThermoData) => {
    for (let thermo of loadedData) {
      this.data.push([])
      for (let cell of thermo.lines[0]) {
        const [row, column] = cell
          .slice(1)
          .split('C')
          .map((i) => parseInt(i))
        this.data[this.data.length - 1].push([row, column])
      }
    }
    this.updateMetadata()
  }
}
