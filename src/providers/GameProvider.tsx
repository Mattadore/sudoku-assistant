import { useEffect, useRef } from 'react'
import { useGameStore } from '../stores/gameStore'

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const initialized = useRef(false)

  useEffect(() => {
    if (!initialized.current) {
      useGameStore.getState().initializeBoard(9, 9)
      initialized.current = true
    }
  }, [])

  return <>{children}</>
}
