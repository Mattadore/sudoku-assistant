import { useCallback } from 'react'
import { useGameStore } from '../stores/gameStore'
import { useNetworkStore } from '../stores/networkStore'
import { stringIndex, splitIndex } from 'helper'
import type { GameState } from '../stores/gameStore'

// All callbacks use getState() internally to avoid closing over rapidly-changing
// state (gameState, myUserdata). This keeps the callbacks stable and prevents
// Board from re-rendering on every cell change.
export function useSelection() {
  const networkDispatch = useNetworkStore((s) => s.networkDispatch)
  const updateUserdata = useNetworkStore((s) => s.updateUserdata)

  const selectCellsIf = useCallback(
    (test: (cell: CellData) => boolean) => {
      const { boardState } = useGameStore.getState().gameState
      const selectedIndices: string[] = []
      for (let row = 0; row < boardState.length; ++row) {
        for (let col = 0; col < boardState[row].length; ++col) {
          if (test(boardState[row][col])) {
            selectedIndices.push(stringIndex(row, col))
          }
        }
      }
      updateUserdata({ selectedIndices })
    },
    [updateUserdata],
  )

  const mutateSelectedCells = useCallback(
    (update: (cell: CellData) => void) => {
      const { selectedIndices } = useNetworkStore.getState().myUserdata
      networkDispatch((draft: GameState) => {
        for (const selected of selectedIndices) {
          const [row, column] = splitIndex(selected)
          // If the cell is fixed, only fix the number and just reset it on update
          let priorNum = null
          if (draft.boardState[row][column].fixed) {
            priorNum = draft.boardState[row][column].number
          }
          update(draft.boardState[row][column])
          if (priorNum) {
            draft.boardState[row][column].number = priorNum
          }
        }
      })
    },
    [networkDispatch],
  )

  const toggleAnnotation = useCallback(
    (annotation: string | number, location: AnnotationLocation) => {
      const isNumber = typeof annotation == 'number'
      const container = isNumber ? 'numbers' : 'letters'
      if (location == 'number' && typeof annotation == 'string') return

      // Check if all selected cells already have this annotation
      const { selectedIndices } = useNetworkStore.getState().myUserdata
      const { boardState } = useGameStore.getState().gameState
      let allHave = true
      for (const selected of selectedIndices) {
        const [row, column] = splitIndex(selected)
        const cell = boardState[row][column]
        if (location == 'number') {
          if (cell.number != annotation) {
            allHave = false
            break
          }
        } else if (!(cell[location][container] as any).includes(annotation)) {
          allHave = false
          break
        }
      }
      const enable = !allHave

      mutateSelectedCells((cell) => {
        if (location == 'number') {
          if (typeof annotation == 'string') return
          cell.number = enable ? annotation : null
          return
        }
        if (enable) {
          if (!(cell[location][container] as any).includes(annotation)) {
            ;(cell[location][container] as any).push(annotation)
            cell[location][container].sort()
          }
        } else {
          cell[location][container] = (
            cell[location][container] as any
          ).filter((value: string | number) => annotation !== value)
          cell[location][container].sort()
        }
      })
    },
    [mutateSelectedCells],
  )

  const select = useCallback(
    (
      index: string,
      event: KeyboardEvent | React.MouseEvent<HTMLDivElement, MouseEvent>,
      multi = false,
    ) => {
      if (event.detail === 2) {
        const [row, col] = splitIndex(index)
        const number =
          useGameStore.getState().gameState.boardState[row][col].number
        if (event.shiftKey && number) {
          selectCellsIf(
            (cell) =>
              cell.number === number ||
              cell.center.numbers.includes(number) ||
              cell.bottomRightCorner.numbers.includes(number) ||
              cell.topLeftCorner.numbers.includes(number),
          )
        } else if (number) {
          selectCellsIf((cell) => cell.number === number)
        }
        return
      }

      updateUserdata({ selectorIndex: index })

      const { selectedIndices } = useNetworkStore.getState().myUserdata
      if (event.ctrlKey) {
        if (selectedIndices.includes(index)) {
          updateUserdata({
            selectedIndices: selectedIndices.filter((v) => v !== index),
          })
        }
      } else if (event.shiftKey || multi) {
        if (!selectedIndices.includes(index)) {
          updateUserdata({ selectedIndices: selectedIndices.concat(index) })
        }
      } else {
        updateUserdata({ selectedIndices: [index] })
      }
    },
    [updateUserdata, selectCellsIf],
  )

  return { select, selectCellsIf, mutateSelectedCells, toggleAnnotation }
}
