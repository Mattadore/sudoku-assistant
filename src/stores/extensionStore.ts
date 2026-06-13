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

    // A cell's conflicts can depend on the whole state of a group it belongs
    // to (e.g. a killer cage's sum or no-repeat rule), not just its own value.
    // So when a cell changes, every cell that currently declares a conflict ON
    // it must be reprocessed too: those declarations were computed from a board
    // state that included the changed cell's old value, and would otherwise go
    // stale — leaving cells highlighted after the cause is gone (e.g. a cage
    // stays red after you clear a cell that broke its sum). Gather these
    // reverse dependencies BEFORE any matrix mutation.
    const toProcess = new Set<string>(changedIndices)
    for (const index of changedIndices) {
      const [r, c] = index.split(',').map((i) => parseInt(i))
      for (const numberConflicts of conflictMatrix[r][c].conflicts) {
        for (const [sr, sc] of numberConflicts) {
          toProcess.add(`${sr},${sc}`)
        }
      }
    }

    // First pass: process all affected cells
    const changedSet = toProcess
    const neighbors = new Set<string>()
    for (const index of toProcess) {
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
