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
  clearAllConflicts: () => void
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
          dependencies: extensions
            .filter((ext) => ext.getCellConflicts)
            .reduce(
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

  clearAllConflicts: () => {
    set((s) => ({
      conflictMatrix: s.conflictMatrix.map((row) =>
        row.map((cell) => ({ ...cell, conflicts: cell.conflicts.map(() => []) })),
      ),
    }))
  },

  updateConflicts: (board, changedIndices) => {
    if (!useUIStore.getState().conflictsEnabled) return
    const { extensions, conflictMatrix } = get()
    const { disabledExtensions } = useUIStore.getState()
    // Track all cells whose ConflictData was mutated (changed cell + its neighbors)
    const touched = new Set<string>()

    // Remove old conflicts and recompute for a single cell, returning new
    // conflict target indices
    const processCell = (index: string): string[] => {
      const [row, column] = index.split(',').map((i) => parseInt(i))
      const boardIndex: BoardIndex = [row, column]
      touched.add(index)
      const targets: string[] = []
      for (const extensionName in extensions) {
        const extension = extensions[extensionName]
        if (!extension.getCellConflicts) continue
        if (extension.isRelevant && !extension.isRelevant(boardIndex)) continue
        // Track cells in old dependencies (will be modified by removeConflicts)
        const deps = conflictMatrix[row][column].dependencies[extensionName]
        if (deps) {
          for (const depIndex of Object.keys(deps)) touched.add(depIndex)
        }
        removeConflicts(conflictMatrix, boardIndex, extensionName)
        if (disabledExtensions.has(extensionName)) continue
        const conflictList = extension.getCellConflicts(board, boardIndex)
        addConflicts(conflictMatrix, boardIndex, conflictList, extensionName)
        for (const conflict of conflictList) {
          const target = `${conflict[0]},${conflict[1]}`
          touched.add(target)
          targets.push(target)
        }
      }
      return targets
    }

    // First pass: process all changed cells
    const changedSet = new Set(changedIndices)
    const neighbors = new Set<string>()
    for (const index of changedIndices) {
      for (const target of processCell(index)) {
        if (!changedSet.has(target)) neighbors.add(target)
      }
    }

    // Second pass: reprocess conflict neighbors to enforce bidirectionality.
    // When cell A changes and declares conflicts with cell B, B's conflict
    // list gets an entry pointing to A. But A's conflict list won't have the
    // reverse entry pointing to B unless B is also reprocessed.
    for (const index of neighbors) {
      processCell(index)
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
