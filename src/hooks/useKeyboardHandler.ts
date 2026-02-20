import { useCallback, useEffect } from 'react'
import { useNetworkStore } from '../stores/networkStore'
import { useUIStore } from '../stores/uiStore'
import { stringIndex, splitIndex } from 'helper'
import { useSelection } from './useSelection'

export function useKeyboardHandler(
  selection: ReturnType<typeof useSelection>,
) {
  const networkUndo = useNetworkStore((s) => s.networkUndo)
  const networkRedo = useNetworkStore((s) => s.networkRedo)
  const { select, selectCellsIf, mutateSelectedCells, toggleAnnotation } =
    selection

  const keyCallback = useCallback(
    (event: KeyboardEvent) => {
      // Use getState() to avoid closing over rapidly-changing myUserdata
      const { selectorIndex } = useNetworkStore.getState().myUserdata
      if (selectorIndex === null) return

      // Toggle conflict mode with plain "c" (no modifiers)
      if (
        event.key === 'c' &&
        !event.shiftKey &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey
      ) {
        useUIStore.getState().toggleConflictMode()
        return
      }

      if (
        /^[1-9A-Za-z]$/.test(event.key) ||
        /^[!@#$%^&*(]$/.test(event.key)
      ) {
        if (event.altKey || event.ctrlKey) {
          event.preventDefault()
        }

        const convertShift = ['!', '@', '#', '$', '%', '^', '&', '*', '(']
        let typedKey = event.key
        if (convertShift.indexOf(typedKey) !== -1) {
          typedKey = (convertShift.indexOf(event.key) + 1).toString()
        }
        const isNumber = !isNaN(parseInt(typedKey))
        const keyVal = isNumber ? parseInt(typedKey) : typedKey.toUpperCase()

        if (event.altKey && event.shiftKey) {
          toggleAnnotation(keyVal, 'bottomRightCorner')
        } else if (event.altKey) {
          toggleAnnotation(keyVal, 'topLeftCorner')
        } else if (event.shiftKey) {
          toggleAnnotation(keyVal, 'center')
        } else if (isNumber) {
          toggleAnnotation(keyVal, 'number')
        }
        if (isNumber) return
      }

      const [row, column] = splitIndex(selectorIndex)
      switch (event.key) {
        case 'y':
          if (event.ctrlKey) {
            event.preventDefault()
            networkRedo()
          }
          break
        case 'z':
          if (event.ctrlKey) {
            event.preventDefault()
            networkUndo()
          }
          break
        case 'a':
          if (event.ctrlKey) {
            event.preventDefault()
            selectCellsIf(() => true)
          }
          break
        case 'ArrowLeft':
          if (column > 0) select(stringIndex(row, column - 1), event)
          break
        case 'ArrowRight':
          if (column < 8) select(stringIndex(row, column + 1), event)
          break
        case 'ArrowUp':
          if (row > 0) select(stringIndex(row - 1, column), event)
          break
        case 'ArrowDown':
          if (row < 8) select(stringIndex(row + 1, column), event)
          break
        case 'Backspace':
        case 'Delete':
          if (event.ctrlKey) {
            mutateSelectedCells((cell) => {
              if (cell.color.length > 0) cell.color = []
            })
          } else {
            mutateSelectedCells((cell) => {
              if (cell.number) {
                cell.number = null
              } else {
                cell.center = { letters: [], numbers: [] }
                cell.bottomRightCorner = { letters: [], numbers: [] }
                cell.topLeftCorner = { letters: [], numbers: [] }
              }
            })
          }
          break
      }
    },
    [
      networkUndo,
      networkRedo,
      select,
      selectCellsIf,
      mutateSelectedCells,
      toggleAnnotation,
    ],
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.addEventListener('keydown', keyCallback)
    return () => window.removeEventListener('keydown', keyCallback)
  }, [keyCallback])
}
