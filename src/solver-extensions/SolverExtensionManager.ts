import { addConflicts, removeConflicts } from 'helper'
import { Extensions } from 'solver-extensions'

export class SolverExtensionManager {
  extensions: { [key: string]: SolverExtension } = {}
  conflictMatrix: ConflictMatrix = []
  // extensionConflictMatrices: { [key: string]: ConflictMatrix } = {}
  // [row][col][number] conflicts or not

  settings = {
    disableDefaultValidation: false,
  }

  // update conflict matrix for a given set of cells
  updateCellConflicts = (board: BoardState, indices: string[]) => {
    // what cells need to be recalculated
    for (const index of indices) {
      const [row, column] = index.split(',').map((i) => parseInt(i))
      const boardIndex: BoardIndex = [row, column]
      for (const extensionName in this.extensions) {
        const extension = this.extensions[extensionName]
        if (extension.isRelevant && !extension.isRelevant(boardIndex)) continue
        // if (!this.extensions[extensionName].isRelevant(boardIndex)) continue
        const conflictList = extension.getCellConflicts(board, boardIndex)
        removeConflicts(this.conflictMatrix, boardIndex, extensionName)
        addConflicts(
          this.conflictMatrix,
          boardIndex,
          conflictList,
          extensionName,
        )
      }
    }
  }

  initialize = (board: BoardState, extensions: (keyof typeof Extensions)[]) => {
    // Create the conflict matrix
    const rows = board.length
    const cols = board[0].length
    for (let row = 0; row < rows; ++row) {
      this.conflictMatrix.push([])
      for (let col = 0; col < cols; ++col) {
        this.conflictMatrix[row].push({
          dependencies: extensions.reduce(
            (acc, extension) => ({
              ...acc,
              [extension]: {},
            }),
            {},
          ),
          conflicts: [],
        })
        for (let n = 1; n <= 9; ++n) {
          this.conflictMatrix[row][col].conflicts.push([])
        }
      }
    }
    for (const extension of extensions) {
      this.loadExtension(new Extensions[extension](), board)
    }
    // this.loadExtension()
  }

  getConflictMatrix = () => {
    return this.conflictMatrix
  }

  loadExtension = (extension: SolverExtension, board: BoardState) => {
    if ('settings' in extension) {
      this.settings = { ...this.settings, ...extension.settings }
    }
    this.extensions[extension.extensionName] = extension
    // this.extensionConflictMatrices[extension.extensionName] =
    //   createConflictMatrix(board)
  }
}
