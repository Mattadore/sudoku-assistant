import { create } from 'zustand'

interface UIStore {
  conflictHighlightSet: Set<string>
  setConflictHighlights: (indices: string[]) => void

  sidebarVisible: boolean
  toggleSidebar: () => void

  disabledExtensions: Set<string>
  toggleExtensionEnabled: (name: string) => void

  conflictMode: boolean
  toggleConflictMode: () => void
}

export const useUIStore = create<UIStore>()((set) => ({
  conflictHighlightSet: new Set(),
  setConflictHighlights: (indices) =>
    set({ conflictHighlightSet: new Set(indices) }),

  sidebarVisible: true,
  toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),

  disabledExtensions: new Set(),
  toggleExtensionEnabled: (name) =>
    set((s) => {
      const next = new Set(s.disabledExtensions)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return { disabledExtensions: next }
    }),

  conflictMode: false,
  toggleConflictMode: () => set((s) => ({ conflictMode: !s.conflictMode })),
}))
