export class SolverExtensionManager {
  extensions: { [key: string]: SolverExtension } = {}
  settings = {
    disableDefaultValidation: false
  }

  // check validity of a given board
  getBoardConflicts = (board: BoardState) => {
    const conflicts: ConflictList = {}
    for (const extensionName in this.extensions) {
      let extConflicts : ConflictList
      if (typeof this.extensions[extensionName].getBoardConflicts === 'function') {
        extConflicts = this.extensions[extensionName].getBoardConflicts!(board)
      }
      else {
        // just call "validateCells", much slower
        let cells = []
        for (let row = 0; row < board.length; ++row) {
          for (let column = 0; column < board[row].length; ++column) {
            cells.push(row+","+column)
          }
        }
        extConflicts = this.getCellConflicts(board, cells)
      }
      for (const conflict in extConflicts) {
        conflicts[conflict] = true
      }
    }
    return conflicts
  }

  // check validity of a given set of cells
  getCellConflicts = (board: BoardState, indices: string[]) => {
    const conflicts: ConflictList = {}
    for (const index in indices) {
      const [row, column] = index.split(',').map((i) => parseInt(i))
      for (const extensionName in this.extensions) {
        if (this.extensions[extensionName].getCellConflict(board, row, column)) {
          conflicts[index] = true
        }
      }
    }
    return conflicts
  }

  // load an extension configuration
  // loadConfig = (config: SolverExtensionConfig) => {

  // }

  loadExtension = (extension: SolverExtension) => {
    if ("settings" in extension) {
      this.settings = {...this.settings, ...extension.settings}
    }
    this.extensions[extension.extensionName] = extension
  }
}
