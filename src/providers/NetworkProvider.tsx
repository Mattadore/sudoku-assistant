import { useEffect } from 'react'
import { useNetworkStore } from '../stores/networkStore'

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  useEffect(() => {
    if (typeof window === 'undefined') return

    if (typeof localStorage.color === 'string') {
      useNetworkStore.getState().updateUserdata({ color: localStorage.color })
    }

    useNetworkStore.getState().initializePeer()

    return () => {
      const { peer } = useNetworkStore.getState()
      if (peer) {
        peer.removeAllListeners()
      }
    }
  }, [])

  return <>{children}</>
}
