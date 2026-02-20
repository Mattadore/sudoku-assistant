import { createTheme } from '@mui/material/styles'

// Single source of truth for the app font.
// Change this one value to re-font everything: grid numbers, SVG text,
// sidebar, input pad, and all MUI components.
export const FONT_FAMILY = "'Roboto', 'Helvetica', 'Arial', sans-serif"

export const theme = createTheme({
  typography: {
    fontFamily: FONT_FAMILY,
  },
})
