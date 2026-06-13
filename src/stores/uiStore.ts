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

  conflictsEnabled: boolean
  setConflictsEnabled: (enabled: boolean) => void

  inputMode: 'normal' | 'corner' | 'center' | 'color'
  setInputMode: (mode: 'normal' | 'corner' | 'center' | 'color') => void

  themeId: string
  setThemeId: (id: string) => void

  timerElapsed: number
  timerRunning: boolean
  startTimer: () => void
  pauseTimer: () => void
  resetTimer: () => void
  tickTimer: (delta: number) => void
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

  conflictsEnabled: true,
  setConflictsEnabled: (enabled) => set({ conflictsEnabled: enabled }),

  inputMode: 'normal',
  setInputMode: (mode) => set({ inputMode: mode }),

  themeId: 'classic',
  setThemeId: (id) => {
    if (typeof localStorage !== 'undefined') localStorage.themeId = id
    set({ themeId: id })
  },

  timerElapsed: 0,
  timerRunning: false,
  startTimer: () => set({ timerRunning: true }),
  pauseTimer: () => set({ timerRunning: false }),
  resetTimer: () => set({ timerElapsed: 0, timerRunning: false }),
  tickTimer: (delta) =>
    set((s) => (s.timerRunning ? { timerElapsed: s.timerElapsed + delta } : {})),
}))
