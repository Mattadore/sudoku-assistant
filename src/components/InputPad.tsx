import * as React from 'react'
import { styled } from '@mui/material/styles'
import {
  Box,
  Button,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import {
  Undo,
  Redo,
  Backspace,
  Pause,
  PlayArrow,
  Replay,
} from '@mui/icons-material'
import { useUIStore } from '../stores/uiStore'
import { useNetworkStore } from '../stores/networkStore'
import { useGameStore } from '../stores/gameStore'
import { splitIndex } from 'helper'
import type { GameState } from '../stores/gameStore'
import type { useSelection } from '../hooks/useSelection'

const EMPTY_COLORS: string[] = []

const INPUT_PAD_COLORS = [
  '#CFCFCF', // 1 - Light Gray
  '#545454', // 2 - Dark Gray
  '#EB7532', // 3 - Orange
  '#F7D038', // 4 - Yellow
  '#A3E048', // 5 - Green
  '#68CCCA', // 6 - Teal
  '#73D8FF', // 7 - Blue
  '#AEA1FF', // 8 - Purple
  '#f55f73', // 9 - Red/Pink
]

const PadContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--pad-gap);
  padding: var(--pad-padding);
  user-select: none;
  flex-shrink: 0;
`

const DigitGrid = styled(Box)`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--pad-grid-gap);
`

const DigitButton = styled(Button)`
  min-width: var(--pad-btn);
  min-height: var(--pad-btn);
  font-size: var(--pad-font);
  font-weight: 700;
  padding: 0;
  border-radius: 8px;
  color: #222;
  background: #e8e8f0;
  &:hover {
    background: #d0d0e0;
  }
`

const ColorSwatch = styled(Button, {
  shouldForwardProp: (prop) => prop !== 'swatchColor',
})<{ swatchColor: string }>`
  min-width: var(--pad-btn);
  min-height: var(--pad-btn);
  padding: 0;
  border-radius: 8px;
  background: ${({ swatchColor }) => swatchColor};
  border: 2px solid rgba(0, 0, 0, 0.15);
  &:hover {
    background: ${({ swatchColor }) => swatchColor};
    opacity: 0.85;
  }
`

const ACTIVE_SWATCH_SX = {
  boxShadow:
    'inset 0 0 0 3px rgba(255,255,255,0.9), inset 0 0 0 5px rgba(0,0,0,0.35) !important',
} as const

const ActionRow = styled(Box)`
  display: flex;
  gap: var(--pad-grid-gap);
  justify-content: center;
  align-items: center;
`

const ActionButton = styled(Button)`
  min-width: var(--pad-btn);
  min-height: var(--pad-action-h);
  border-radius: 8px;
  color: #444;
  background: #e0e0e8;
  &:hover {
    background: #d0d0d8;
  }
`

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

const TimerDisplay: React.FC = () => {
  const elapsed = useUIStore((s) => s.timerElapsed)
  const running = useUIStore((s) => s.timerRunning)
  const startTimer = useUIStore((s) => s.startTimer)
  const pauseTimer = useUIStore((s) => s.pauseTimer)
  const resetTimer = useUIStore((s) => s.resetTimer)

  React.useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      useUIStore.getState().tickTimer(100)
    }, 100)
    return () => clearInterval(id)
  }, [running])

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Typography
        sx={{
          fontFamily: 'monospace',
          fontSize: '1.3rem',
          fontWeight: 600,
          minWidth: 72,
          textAlign: 'center',
          color: running ? '#222' : '#888',
        }}
      >
        {formatTime(elapsed)}
      </Typography>
      <IconButton size="small" onClick={running ? pauseTimer : startTimer}>
        {running ? <Pause fontSize="small" /> : <PlayArrow fontSize="small" />}
      </IconButton>
      <IconButton size="small" onClick={resetTimer}>
        <Replay fontSize="small" />
      </IconButton>
    </Box>
  )
}

type InputPadProps = {
  selection: ReturnType<typeof useSelection>
  compact?: boolean
}

const PAD_VARS_NORMAL = {
  '--pad-btn': 'clamp(36px, 6vh, 56px)',
  '--pad-action-h': 'clamp(28px, 5vh, 44px)',
  '--pad-gap': 'clamp(4px, 1vh, 8px)',
  '--pad-grid-gap': 'clamp(3px, 0.6vh, 6px)',
  '--pad-padding': 'clamp(4px, 1vh, 12px) 8px',
  '--pad-font': 'clamp(1rem, 2vh, 1.4rem)',
} as React.CSSProperties

const PAD_VARS_COMPACT = {
  '--pad-btn': 'clamp(32px, 9vw, 44px)',
  '--pad-action-h': 'clamp(28px, 8vw, 36px)',
  '--pad-gap': 'clamp(2px, 0.5vh, 4px)',
  '--pad-grid-gap': 'clamp(2px, 0.4vh, 4px)',
  '--pad-padding': '4px 8px',
  '--pad-font': 'clamp(0.9rem, 2.5vw, 1.2rem)',
} as React.CSSProperties

export const InputPad: React.FC<InputPadProps> = ({ selection, compact }) => {
  const { toggleAnnotation, mutateSelectedCells } = selection
  const inputMode = useUIStore((s) => s.inputMode)
  const setInputMode = useUIStore((s) => s.setInputMode)
  const networkUndo = useNetworkStore((s) => s.networkUndo)
  const networkRedo = useNetworkStore((s) => s.networkRedo)
  const networkDispatch = useNetworkStore((s) => s.networkDispatch)
  const selectedIndices = useNetworkStore((s) => s.myUserdata.selectedIndices)
  const selectorIndex = useNetworkStore((s) => s.myUserdata.selectorIndex)
  const selectorCellColors = useGameStore((s) => {
    if (!selectorIndex) return EMPTY_COLORS
    const [row, col] = splitIndex(selectorIndex)
    return s.gameState.boardState[row]?.[col]?.color ?? EMPTY_COLORS
  })

  const handleDigit = React.useCallback(
    (n: number) => {
      switch (inputMode) {
        case 'normal':
          toggleAnnotation(n, 'number')
          break
        case 'corner':
          toggleAnnotation(n, 'topLeftCorner')
          break
        case 'center':
          toggleAnnotation(n, 'center')
          break
      }
    },
    [inputMode, toggleAnnotation],
  )

  const handleColor = React.useCallback(
    (colorHex: string) => {
      networkDispatch((draft: GameState) => {
        for (const selected of selectedIndices) {
          const [row, column] = splitIndex(selected)
          const cell = draft.boardState[row][column]
          const idx = cell.color.indexOf(colorHex)
          if (idx >= 0) {
            cell.color.splice(idx, 1)
          } else {
            cell.color.push(colorHex)
          }
        }
      })
    },
    [networkDispatch, selectedIndices],
  )

  const handleDelete = React.useCallback(() => {
    if (inputMode === 'color') {
      mutateSelectedCells((cell) => {
        if (cell.color.length > 0) cell.color = []
      })
    } else {
      mutateSelectedCells((cell) => {
        if (cell.number) {
          cell.number = null
        } else {
          cell.center = { letters: [], numbers: [] }
          cell.bottomRightCorner = { letters: [], numbers: [] }
          cell.topLeftCorner = { letters: [], numbers: [] }
        }
      })
    }
  }, [inputMode, mutateSelectedCells])

  const isColor = inputMode === 'color'

  return (
    <PadContainer
      style={compact ? PAD_VARS_COMPACT : PAD_VARS_NORMAL}
      onMouseDown={(e: React.MouseEvent) => {
        e.stopPropagation()
      }}
    >
      <TimerDisplay />
      <ToggleButtonGroup
        value={inputMode}
        exclusive
        onChange={(_, val) => val && setInputMode(val)}
        size="small"
        sx={{
          '& .MuiToggleButton-root': {
            px: compact ? 1 : 2,
            py: 0.5,
            fontSize: compact ? '0.7rem' : '0.8rem',
            fontWeight: 600,
            textTransform: 'none',
          },
        }}
      >
        <ToggleButton value="normal">Normal</ToggleButton>
        <ToggleButton value="corner">Corner</ToggleButton>
        <ToggleButton value="center">Center</ToggleButton>
        <ToggleButton value="color">Color</ToggleButton>
      </ToggleButtonGroup>

      <DigitGrid>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) =>
          isColor ? (
            <ColorSwatch
              key={n}
              swatchColor={INPUT_PAD_COLORS[n - 1]}
              onClick={() => handleColor(INPUT_PAD_COLORS[n - 1])}
              sx={
                selectorCellColors.includes(INPUT_PAD_COLORS[n - 1])
                  ? ACTIVE_SWATCH_SX
                  : undefined
              }
            />
          ) : (
            <DigitButton key={n} onClick={() => handleDigit(n)}>
              {n}
            </DigitButton>
          ),
        )}
      </DigitGrid>

      <ActionRow>
        <ActionButton onClick={networkUndo}>
          <Undo fontSize="small" />
        </ActionButton>
        <ActionButton onClick={handleDelete}>
          <Backspace fontSize="small" />
        </ActionButton>
        <ActionButton onClick={networkRedo}>
          <Redo fontSize="small" />
        </ActionButton>
      </ActionRow>

    </PadContainer>
  )
}
