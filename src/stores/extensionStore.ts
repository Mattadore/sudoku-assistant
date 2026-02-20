import { create } from 'zustand'
import { addConflicts, removeConflicts } from 'helper'
import { useUIStore } from './uiStore'

interface ExtensionStore {
  extensions: { [key: string]: SolverExtension }
  conflictMatrix: ConflictMatrix
  settings: { disableDefaultValidation: boolean }

  initialize: (board: BoardState, extensions: SolverExtension[]) => void
  registerExtension: (extension: SolverExtension) => void
  updateConflicts: (board: BoardState, changedIndices: string[]) => void
}

export const useExtensionStore = create<ExtensionStore>()((set, get) => ({
  extensions: {},
  conflictMatrix: [],
  settings: { disableDefaultValidation: false },

  initialize: (board, extensions) => {
    const rows = board.length
    const cols = board[0].length
    const conflictMatrix: ConflictMatrix = []

    for (let row = 0; row < rows; ++row) {
      conflictMatrix.push([])
      for (let col = 0; col < cols; ++col) {
        conflictMatrix[row].push({
          dependencies: extensions.reduce(
            (acc, ext) => ({ ...acc, [ext.extensionName]: {} }),
            {},
          ),
          conflicts: [],
        })
        for (let n = 1; n <= 9; ++n) {
          conflictMatrix[row][col].conflicts.push([])
        }
      }
    }

    const extensionMap: { [key: string]: SolverExtension } = {}
    let mergedSettings = { disableDefaultValidation: false }
    for (const ext of extensions) {
      extensionMap[ext.extensionName] = ext
      if (ext.settings) {
        mergedSettings = { ...mergedSettings, ...ext.settings }
      }
    }

    set({ conflictMatrix, extensions: extensionMap, settings: mergedSettings })
  },

  registerExtension: (extension) => {
    set((state) => ({
      extensions: { ...state.extensions, [extension.extensionName]: extension },
      settings: extension.settings
        ? { ...state.settings, ...extension.settings }
        : state.settings,
    }))
  },

  updateConflicts: (board, changedIndices) => {
    const { extensions, conflictMatrix } = get()
    // Track all cells whose ConflictData was mutated (changed cell + its neighbors)
    const touched = new Set<string>()
    for (const index of changedIndices) {
      const [row, column] = index.split(',').map((i) => parseInt(i))
      const boardIndex: BoardIndex = [row, column]
      touched.add(index)
      const { disabledExtensions } = useUIStore.getState()
      for (const extensionName in extensions) {
        const extension = extensions[extensionName]
        if (extension.isRelevant && !extension.isRelevant(boardIndex)) continue
        // Track cells in old dependencies (will be modified by removeConflicts)
        const deps = conflictMatrix[row][column].dependencies[extensionName]
        if (deps) {
          for (const depIndex of Object.keys(deps)) touched.add(depIndex)
        }
        removeConflicts(conflictMatrix, boardIndex, extensionName)
        // Only recompute conflicts for enabled extensions
        if (disabledExtensions.has(extensionName)) continue
        const conflictList = extension.getCellConflicts(board, boardIndex)
        addConflicts(conflictMatrix, boardIndex, conflictList, extensionName)
        // Track cells in new conflicts (were modified by addConflicts)
        for (const conflict of conflictList) {
          touched.add(`${conflict[0]},${conflict[1]}`)
        }
      }
    }
    // Create new ConflictData references for all touched cells so Zustand
    // selectors detect the change and trigger re-renders
    const newMatrix = conflictMatrix.map((row, r) =>
      row.map((cell, c) =>
        touched.has(`${r},${c}`) ? { ...cell } : cell,
      ),
    )
    set({ conflictMatrix: newMatrix })
  },
}))
