import * as React from 'react'
import { useEffect, useMemo, useRef } from 'react'
import type { AppProps } from 'next/app'
import { StyledEngineProvider, ThemeProvider } from '@mui/material/styles'
import { createTheme } from '@mui/material/styles'
import { FONT_FAMILY } from '../theme'
import { useUIStore } from '../stores/uiStore'
import { THEMES, themeToCSSVars } from '../themes'
import '../global.css'

import '@fontsource/roboto/300.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'

// Switches MUI between dark/light mode and wires up sudoku theme colors so the
// sidebar, drawers, and all MUI components use the same palette as the board.
const ThemeRoot: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const themeId = useUIStore((s) => s.themeId)
  const sudokuTheme = THEMES[themeId] ?? THEMES.classic
  const muiTheme = useMemo(
    () =>
      createTheme({
        typography: { fontFamily: FONT_FAMILY },
        palette: {
          mode: sudokuTheme.isDark ? 'dark' : 'light',
          background: {
            default: sudokuTheme.pageBackground,
            paper: sudokuTheme.cell.background,
          },
          text: {
            primary: sudokuTheme.cell.fixedNumber,
          },
          divider: sudokuTheme.board.gridLine,
        },
      }),
    [sudokuTheme],
  )
  return <ThemeProvider theme={muiTheme}>{children}</ThemeProvider>
}

// Applies --sudoku-* CSS custom properties to <html> so they cascade everywhere.
// The blocking script in _document.tsx already sets them before first paint;
// this component keeps them in sync when the user switches themes.
const ThemeVars: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const themeId = useUIStore((s) => s.themeId)
  const setThemeId = useUIStore((s) => s.setThemeId)
  // Tracks whether the initial mount effect has run. The themeId-watching effect
  // must skip its first fire (themeId='classic') so it doesn't clobber the
  // blocking script's correct vars before localStorage has been read.
  const hasMounted = useRef(false)

  // Apply CSS vars to <html> when themeId changes (theme picker). Skipped on
  // the initial mount — the blocking script already applied the correct vars.
  useEffect(() => {
    if (!hasMounted.current) return
    const theme = THEMES[themeId] ?? THEMES.classic
    const vars = themeToCSSVars(theme)
    const root = document.documentElement
    for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v)
  }, [themeId])

  // On mount: mark as mounted, then sync the Zustand store from localStorage.
  // The blocking script already applied the correct vars, so no flash occurs
  // during the store sync (which may trigger a re-render).
  useEffect(() => {
    hasMounted.current = true
    const saved = localStorage.themeId
    const id = saved && THEMES[saved] ? saved : 'classic'
    if (id !== themeId) setThemeId(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <>{children}</>
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <StyledEngineProvider injectFirst>
      <ThemeRoot>
        <ThemeVars>
          <Component {...pageProps} />
        </ThemeVars>
      </ThemeRoot>
    </StyledEngineProvider>
  )
}
