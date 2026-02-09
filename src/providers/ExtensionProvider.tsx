import { useEffect, useRef } from 'react'
import { useExtensionStore } from '../stores/extensionStore'
import { useGameStore } from '../stores/gameStore'
import Sudoku from '../solver-extensions/Sudoku'

interface ExtensionProviderProps {
  children: React.ReactNode
  extensions?: SolverExtension[]
}

export const ExtensionProvider: React.FC<ExtensionProviderProps> = ({
  children,
  extensions = [new Sudoku()],
}) => {
  const initialized = useRef(false)

  useEffect(() => {
    if (!initialized.current) {
      const board = useGameStore.getState().gameState.boardState
      useExtensionStore.getState().initialize(board, extensions)
      initialized.current = true
    }
  }, [extensions])

  return <>{children}</>
}
