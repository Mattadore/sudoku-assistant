import { useEffect, useRef } from 'react'
import { useGameStore } from '../stores/gameStore'
import { useNetworkStore } from '../stores/networkStore'
import {
  restoreSession,
  subscribePersistence,
  saveSession,
  clearSession,
} from '../stores/persistence'

// Dev-only console helper. Lets you force a guaranteed-safe reload from the
// frontend (save current board, then reload — it comes back) and poke at the
// stores while debugging. Stripped out of production builds.
function installDevConsoleApi(): () => void {
  if (typeof window === 'undefined' || process.env.NODE_ENV === 'production') {
    return () => {}
  }
  ;(window as any).__sudoku = {
    /** Persist the current board now. */
    save: saveSession,
    /** Re-apply the last saved session into the live stores. */
    restore: restoreSession,
    /** Forget the saved session. */
    clear: clearSession,
    /** Save the board, then full-reload the page (board is restored on load). */
    reload: () => {
      saveSession()
      window.location.reload()
    },
    /** Raw store handles for inspection: __sudoku.game.getState() etc. */
    game: useGameStore,
    network: useNetworkStore,
  }
  // eslint-disable-next-line no-console
  console.info(
    '[sudoku] dev console ready: __sudoku.reload() to force a safe reload; ' +
      '__sudoku.save() / .restore() / .clear() / .game / .network',
  )
  return () => {
    delete (window as any).__sudoku
  }
}

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
    const removeDevApi = installDevConsoleApi()
    return () => {
      unsubscribe()
      removeDevApi()
    }
  }, [])

  return <>{children}</>
}
