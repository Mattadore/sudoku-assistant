import { useEffect, useRef } from 'react'
import { useGameStore } from '../stores/gameStore'
import { restoreSession, subscribePersistence } from '../stores/persistence'

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    // Restore an in-progress session from a previous visit; fall back to a
    // blank board only when there is nothing saved. Then keep persisting.
    const restored = restoreSession()
    if (!restored) {
      useGameStore.getState().initializeBoard(9, 9)
    }
    const unsubscribe = subscribePersistence()
    return unsubscribe
  }, [])

  return <>{children}</>
}
