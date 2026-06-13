import { useUIStore } from './stores/uiStore'

export interface SudokuTheme {
  id: string
  name: string
  isDark: boolean
  /** Background of the page area behind the board */
  pageBackground: string
  cell: {
    background: string
    fixedNumber: string
    enteredNumber: string
    conflictNumber: string
    conflictHighlight: string
    annotation: string
  }
  board: {
    border: string
    gridLine: string
  }
  selection: {
    primary: string
    highlight: string
  }
  overlay: {
    line: string
    renban: string
    whispers: string
    cage: string
    dot: string
    dotText: string
    dotBackground: string
    minmax: string
  }
}

export const THEMES: Record<string, SudokuTheme> = {
  classic: {
    id: 'classic',
    name: 'Classic',
    isDark: false,
    pageBackground: '#ddddff',
    cell: {
      background: '#ffffff',
      fixedNumber: '#171717',
      enteredNumber: '#00ccff',
      conflictNumber: '#AC3235',
      conflictHighlight: 'rgba(172, 50, 53, 0.2)',
      annotation: '#00ccff',
    },
    board: { border: '#333333', gridLine: '#bbbbbb' },
    selection: { primary: '#ffcc00', highlight: '#ddaa00' },
    overlay: {
      line: '#AAAAAA',
      renban: '#BB44BB',
      whispers: '#44BB44',
      cage: '#333333',
      dot: '#333333',
      dotText: '#111111',
      dotBackground: '#ffffff',
      minmax: 'rgba(140, 140, 140, 0.35)',
    },
  },

  warm: {
    id: 'warm',
    name: 'Warm',
    isDark: false,
    pageBackground: '#E8D9C0',
    cell: {
      background: '#FAF7F0',
      fixedNumber: '#2D1F0A',
      enteredNumber: '#B05A00',
      conflictNumber: '#C0392B',
      conflictHighlight: 'rgba(192, 57, 43, 0.18)',
      annotation: '#B05A00',
    },
    board: { border: '#5C4A2A', gridLine: '#C9B99A' },
    selection: { primary: '#D4A017', highlight: '#B8860B' },
    overlay: {
      line: '#A89070',
      renban: '#AA4488',
      whispers: '#3A9A40',
      cage: '#5C4A2A',
      dot: '#5C4A2A',
      dotText: '#2D1F0A',
      dotBackground: '#FAF7F0',
      minmax: 'rgba(160, 120, 70, 0.35)',
    },
  },

  arctic: {
    id: 'arctic',
    name: 'Arctic',
    isDark: false,
    pageBackground: '#C8DDEF',
    cell: {
      background: '#EFF4FA',
      fixedNumber: '#1A2840',
      enteredNumber: '#0077CC',
      conflictNumber: '#CC2244',
      conflictHighlight: 'rgba(204, 34, 68, 0.15)',
      annotation: '#0077CC',
    },
    board: { border: '#2255AA', gridLine: '#A0B8D8' },
    selection: { primary: '#5599DD', highlight: '#3377BB' },
    overlay: {
      line: '#7799BB',
      renban: '#8844CC',
      whispers: '#118844',
      cage: '#2255AA',
      dot: '#2255AA',
      dotText: '#1A2840',
      dotBackground: '#EFF4FA',
      minmax: 'rgba(80, 130, 200, 0.3)',
    },
  },

  midnight: {
    id: 'midnight',
    name: 'Midnight',
    isDark: true,
    pageBackground: '#0D1220',
    cell: {
      background: '#1A2035',
      fixedNumber: '#E0E8FF',
      enteredNumber: '#55DDFF',
      conflictNumber: '#FF6B7A',
      conflictHighlight: 'rgba(255, 107, 122, 0.2)',
      annotation: '#55DDFF',
    },
    board: { border: '#6688CC', gridLine: '#344870' },
    selection: { primary: '#3355CC', highlight: '#2244AA' },
    overlay: {
      line: '#5577AA',
      renban: '#CC66FF',
      whispers: '#44CC88',
      cage: '#4466AA',
      dot: '#7799CC',
      dotText: '#E0E8FF',
      dotBackground: '#253050',
      minmax: 'rgba(80, 120, 200, 0.35)',
    },
  },

  obsidian: {
    id: 'obsidian',
    name: 'Obsidian',
    isDark: true,
    pageBackground: '#111111',
    cell: {
      background: '#1C1C1E',
      fixedNumber: '#F0F0F0',
      enteredNumber: '#FFCA44',
      conflictNumber: '#FF5555',
      conflictHighlight: 'rgba(255, 85, 85, 0.2)',
      annotation: '#FFCA44',
    },
    board: { border: '#888888', gridLine: '#3C3C3E' },
    selection: { primary: '#E07020', highlight: '#B85C10' },
    overlay: {
      line: '#777777',
      renban: '#BB66FF',
      whispers: '#55BB55',
      cage: '#888888',
      dot: '#888888',
      dotText: '#F0F0F0',
      dotBackground: '#2C2C2E',
      minmax: 'rgba(150, 150, 150, 0.35)',
    },
  },

  forest: {
    id: 'forest',
    name: 'Forest',
    isDark: true,
    pageBackground: '#0E1710',
    cell: {
      background: '#1A2520',
      fixedNumber: '#D8EED8',
      enteredNumber: '#66CC88',
      conflictNumber: '#FF7755',
      conflictHighlight: 'rgba(255, 119, 85, 0.2)',
      annotation: '#66CC88',
    },
    board: { border: '#569966', gridLine: '#2E4A32' },
    selection: { primary: '#339955', highlight: '#227744' },
    overlay: {
      line: '#5A8866',
      renban: '#BB55AA',
      whispers: '#88CC44',
      cage: '#3A6644',
      dot: '#5A8866',
      dotText: '#D8EED8',
      dotBackground: '#253528',
      minmax: 'rgba(80, 160, 100, 0.35)',
    },
  },
}

export const THEME_LIST: SudokuTheme[] = [
  THEMES.classic,
  THEMES.warm,
  THEMES.arctic,
  THEMES.midnight,
  THEMES.obsidian,
  THEMES.forest,
]

export function getCurrentTheme(): SudokuTheme {
  const id = useUIStore.getState().themeId
  return THEMES[id] ?? THEMES.classic
}

export function themeToCSSVars(t: SudokuTheme): Record<string, string> {
  return {
    '--sudoku-page-bg': t.pageBackground,
    '--sudoku-cell-bg': t.cell.background,
    '--sudoku-fixed-number': t.cell.fixedNumber,
    '--sudoku-entered-number': t.cell.enteredNumber,
    '--sudoku-conflict-number': t.cell.conflictNumber,
    '--sudoku-conflict-highlight': t.cell.conflictHighlight,
    '--sudoku-annotation': t.cell.annotation,
    '--sudoku-board-border': t.board.border,
    '--sudoku-board-gridline': t.board.gridLine,
    '--sudoku-selection-primary': t.selection.primary,
    '--sudoku-selection-highlight': t.selection.highlight,
    '--sudoku-overlay-line': t.overlay.line,
    '--sudoku-overlay-renban': t.overlay.renban,
    '--sudoku-overlay-whispers': t.overlay.whispers,
    '--sudoku-overlay-cage': t.overlay.cage,
    '--sudoku-overlay-dot': t.overlay.dot,
    '--sudoku-overlay-dot-text': t.overlay.dotText,
    '--sudoku-overlay-dot-bg': t.overlay.dotBackground,
    '--sudoku-overlay-minmax': t.overlay.minmax,
  }
}
