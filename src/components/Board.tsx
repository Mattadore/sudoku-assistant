import * as React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import emoStyled from '@emotion/styled'
import { styled } from '@mui/material/styles'
import { Box, Container } from '@mui/material'
import { useGameStore } from '../stores/gameStore'
import { useNetworkStore } from '../stores/networkStore'
import { useExtensionStore } from '../stores/extensionStore'
import { useUIStore } from '../stores/uiStore'
import { splitIndex, extensionColor } from 'helper'
import {
  CELL_GAP,
  cellCenter,
  cellRect,
  gridViewBox,
  overlayStyle,
  underlayStyle,
} from '../solver-extensions/svgHelpers'
import { GridCell } from './GridCell'
import { InputPad } from './InputPad'
import { useSelection } from '../hooks/useSelection'
import { useKeyboardHandler } from '../hooks/useKeyboardHandler'
import { stringIndex } from 'helper'

type SudokuImageData = {
  leftEdge: number
  rightEdge: number
  topEdge: number
  bottomEdge: number
  imageData: ImageData | null
}

const SudokuImageCanvas = emoStyled.canvas<{
  image: SudokuImageData
}>`
  position: absolute;
  width: 100%;
  height: 100%;
  flex: 1;
  pointer-events: none;
  top: ${({ image }) =>
    image.imageData
      ? (-100 * image.topEdge) / (image.bottomEdge - image.topEdge + 1) + '%'
      : '0px'};
  left: ${({ image }) =>
    image.imageData
      ? (-100 * image.leftEdge) / (image.rightEdge - image.leftEdge + 1) + '%'
      : '0px'};
  width: ${({ image }) =>
    image.imageData
      ? (100 * image.imageData.width) / (image.rightEdge - image.leftEdge + 1) +
        '%'
      : '100%'};
  height: ${({ image }) =>
    image.imageData
      ? (100 * image.imageData.height) /
          (image.bottomEdge - image.topEdge + 1) +
        '%'
      : '100%'};
`

const SudokuGrid = styled(Box)`
  display: grid;
`

const GridContainer = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  user-select: none;
  cursor: default;
`

const GridBackground = styled(Box)`
  position: relative;
  margin: 0;
  padding: 0px;
  background-color: var(--sudoku-board-gridline);
  z-index: 0;
`

// Outer area extends one cell stride outside the grid for outer clues
const OuterArea = styled(Box)`
  position: relative;
`

const ImageCanvases = React.memo(({ image }: { image: SudokuImageData }) => (
  <>
    <SudokuImageCanvas
      style={{ zIndex: 300 }}
      image={image}
      id="sudoku-annotations"
    />
    <SudokuImageCanvas
      style={{ zIndex: 250 }}
      image={image}
      id="sudoku-extensions"
    />
    <SudokuImageCanvas
      style={{ zIndex: 200 }}
      image={image}
      id="sudoku-image"
    />
  </>
))

// Cell size in px (matches GridCell 5rem = 80px at default font size)
const CELL_SIZE = 80
// One cell stride in SVG/CSS units (cell + gap). Used for outer area padding.
const CELL_STRIDE = CELL_SIZE + CELL_GAP
// SudokuGrid padding: half the cell gap so HTML grid dimensions match SVG viewBox exactly.
// Each cell has 0.5px margin on each side, so the total gap between cells = 1px = CELL_GAP.
// Grid padding = 0.5px means: grid edge (0.5px) + cell margin (0.5px) = 1px = CELL_GAP.
const GRID_PAD = `${CELL_GAP / 2}px`

function makeGridIndices(rows: number, cols: number): [number, number][] {
  const indices: [number, number][] = []
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      indices.push([row, col])
    }
  }
  return indices
}

const ExtensionUnderlays: React.FC = React.memo(() => {
  const extensions = useExtensionStore((s) => s.extensions)
  const boardState = useGameStore((s) => s.gameState.boardState)
  const gridConfig = useGameStore((s) => s.gameState.gridConfig)
  const disabledExtensions = useUIStore((s) => s.disabledExtensions)
  useUIStore((s) => s.themeId) // re-render when theme changes
  const underlays = Object.values(extensions)
    .filter(
      (ext) =>
        ext.getBoardUnderlay && !disabledExtensions.has(ext.extensionName),
    )
    .map((ext) => (
      <React.Fragment key={ext.extensionName}>
        {ext.getBoardUnderlay!(boardState, CELL_SIZE)}
      </React.Fragment>
    ))
  if (underlays.length === 0) return null

  // Build clip path from cell rectangles so grid lines remain visible
  const clipRects: React.ReactNode[] = []
  for (let r = 0; r < gridConfig.rows; r++) {
    for (let c = 0; c < gridConfig.cols; c++) {
      const rect = cellRect(r, c, CELL_SIZE)
      clipRects.push(
        <rect
          key={`${r},${c}`}
          x={rect.x}
          y={rect.y}
          width={rect.w}
          height={rect.h}
        />,
      )
    }
  }

  return (
    <svg
      viewBox={gridViewBox(CELL_SIZE, gridConfig.rows, gridConfig.cols)}
      style={underlayStyle()}
    >
      <defs>
        <clipPath id="cell-bounds-clip">{clipRects}</clipPath>
      </defs>
      <g clipPath="url(#cell-bounds-clip)">{underlays}</g>
    </svg>
  )
})

const ExtensionOverlays: React.FC = React.memo(() => {
  const extensions = useExtensionStore((s) => s.extensions)
  const boardState = useGameStore((s) => s.gameState.boardState)
  const disabledExtensions = useUIStore((s) => s.disabledExtensions)
  useUIStore((s) => s.themeId) // re-render when theme changes so extensions pick up new colors
  const overlays = Object.values(extensions)
    .filter(
      (ext) =>
        ext.getBoardOverlay && !disabledExtensions.has(ext.extensionName),
    )
    .map((ext) => (
      <React.Fragment key={ext.extensionName}>
        {ext.getBoardOverlay!(boardState, CELL_SIZE)}
      </React.Fragment>
    ))
  return overlays.length > 0 ? <>{overlays}</> : null
})

const OuterExtensionOverlays: React.FC = React.memo(() => {
  const extensions = useExtensionStore((s) => s.extensions)
  const boardState = useGameStore((s) => s.gameState.boardState)
  const disabledExtensions = useUIStore((s) => s.disabledExtensions)
  useUIStore((s) => s.themeId) // re-render when theme changes
  const overlays = Object.values(extensions)
    .filter(
      (ext) =>
        ext.getOuterOverlay && !disabledExtensions.has(ext.extensionName),
    )
    .map((ext) => (
      <React.Fragment key={ext.extensionName}>
        {ext.getOuterOverlay!(boardState, CELL_SIZE)}
      </React.Fragment>
    ))
  return overlays.length > 0 ? <>{overlays}</> : null
})

const ConflictArrowOverlay: React.FC = React.memo(() => {
  const conflictMode = useUIStore((s) => s.conflictMode)
  const selectorIndex = useNetworkStore((s) => s.myUserdata.selectorIndex)
  const gridConfig = useGameStore((s) => s.gameState.gridConfig)

  const cellNumber = useGameStore((s) => {
    if (!selectorIndex) return null
    const [r, c] = splitIndex(selectorIndex)
    return s.gameState.boardState[r]?.[c]?.number ?? null
  })

  const conflictData = useExtensionStore((s) => {
    if (!selectorIndex) return null
    const [r, c] = splitIndex(selectorIndex)
    return s.conflictMatrix[r]?.[c] ?? null
  })

  const arrows = useMemo(() => {
    if (!conflictMode || !selectorIndex || !cellNumber || !conflictData)
      return []
    const entries = conflictData.conflicts[cellNumber - 1]
    if (!entries || entries.length === 0) return []
    const [srcRow, srcCol] = splitIndex(selectorIndex)
    const src = cellCenter(srcRow, srcCol, CELL_SIZE)
    return entries
      .filter(([r, c]) => `${r},${c}` !== selectorIndex)
      .map(([r, c, ext]) => {
        const dst = cellCenter(r, c, CELL_SIZE)
        const dx = dst.x - src.x
        const dy = dst.y - src.y
        const len = Math.sqrt(dx * dx + dy * dy)
        if (len === 0) return null
        const shorten = CELL_SIZE * 0.35
        const nx = dx / len
        const ny = dy / len
        return {
          x1: src.x + nx * shorten,
          y1: src.y + ny * shorten,
          x2: dst.x - nx * shorten,
          y2: dst.y - ny * shorten,
          ext,
          key: `${r},${c},${ext}`,
        }
      })
      .filter(Boolean) as {
      x1: number
      y1: number
      x2: number
      y2: number
      ext: string
      key: string
    }[]
  }, [conflictMode, selectorIndex, cellNumber, conflictData])

  if (arrows.length === 0) return null

  // Collect unique extension names for marker defs
  const extNames = [...new Set(arrows.map((a) => a.ext))]

  return (
    <svg
      viewBox={gridViewBox(CELL_SIZE, gridConfig.rows, gridConfig.cols)}
      style={{ ...overlayStyle(), zIndex: 6000, opacity: 0.8 }}
    >
      <defs>
        {extNames.map((name) => (
          <marker
            key={name}
            id={`conflict-arrow-${name}`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={extensionColor(name)} />
          </marker>
        ))}
      </defs>
      {arrows.map((a) => (
        <line
          key={a.key}
          x1={a.x1}
          y1={a.y1}
          x2={a.x2}
          y2={a.y2}
          stroke={extensionColor(a.ext)}
          strokeWidth={3}
          strokeLinecap="round"
          markerEnd={`url(#conflict-arrow-${a.ext})`}
        />
      ))}
    </svg>
  )
})

export const Board: React.FC = () => {
  const image = useNetworkStore((s) => s.image)
  const imageLoaded = !!image.imageData
  const gridConfig = useGameStore((s) => s.gameState.gridConfig)
  const selection = useSelection()
  const { select } = selection

  useKeyboardHandler(selection)

  const gridIndices = useMemo(
    () => makeGridIndices(gridConfig.rows, gridConfig.cols),
    [gridConfig.rows, gridConfig.cols],
  )

  // --- Compact/mobile detection ---
  const [isCompact, setIsCompact] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(max-width: 768px)')
    setIsCompact(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsCompact(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // --- Grid scaling to fit container ---
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      setContainerSize({ w: width, h: height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const padRef = useRef<HTMLDivElement>(null)
  const [padWidth, setPadWidth] = useState(220)

  useEffect(() => {
    if (isCompact) return
    const el = padRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      setPadWidth(entries[0].contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [isCompact])

  // Natural (unscaled) dimensions of the grid + outer area
  const naturalW = (gridConfig.cols + 2) * CELL_STRIDE + CELL_GAP
  const naturalH = (gridConfig.rows + 2) * CELL_STRIDE + CELL_GAP

  const gridScale =
    containerSize.w > 0 && containerSize.h > 0
      ? Math.min(
          (containerSize.w - (isCompact ? 0 : padWidth)) / naturalW,
          containerSize.h / naturalH,
          1,
        )
      : 1

  // Deselect keyboard focus when clicking outside the grid
  useEffect(() => {
    if (typeof window === 'undefined') return
    const pageClicked = () => {
      useNetworkStore.getState().updateUserdata({ selectorIndex: null })
    }
    window.addEventListener('mousedown', pageClicked)
    return () => window.removeEventListener('mousedown', pageClicked)
  }, [])

  // Detect puzzle completion: all cells filled with no conflicts
  const boardState = useGameStore((s) => s.gameState.boardState)
  const conflictMatrix = useExtensionStore((s) => s.conflictMatrix)
  const timerRunning = useUIStore((s) => s.timerRunning)
  useEffect(() => {
    if (!timerRunning || boardState.length === 0 || conflictMatrix.length === 0)
      return
    let allFilled = true
    let hasConflict = false
    for (let r = 0; r < boardState.length && !hasConflict; r++) {
      for (let c = 0; c < boardState[0].length; c++) {
        if (!boardState[r][c].number) {
          allFilled = false
          break
        }
        const cd = conflictMatrix[r]?.[c]
        if (cd) {
          for (const nums of cd.conflicts) {
            if (nums.length > 0) {
              hasConflict = true
              break
            }
          }
        }
      }
      if (!allFilled) break
    }
    if (allFilled && !hasConflict) {
      useUIStore.getState().pauseTimer()
      const elapsed = useUIStore.getState().timerElapsed
      const totalSec = Math.floor(elapsed / 1000)
      const m = Math.floor(totalSec / 60)
      const s = totalSec % 60
      const timeStr = m > 0 ? `${m}m ${s}s` : `${s}s`
      setTimeout(() => {
        alert(`Congratulations! Puzzle solved in ${timeStr}!`)
      }, 50)
    }
  }, [boardState, conflictMatrix, timerRunning])

  return (
    <Container
      disableGutters
      maxWidth={false}
      sx={{
        display: 'flex',
        flexDirection: isCompact ? 'column' : 'row',
        alignItems: 'stretch',
        flex: 1,
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <GridContainer ref={containerRef}>
        <Box
          sx={{
            width: naturalW * gridScale,
            height: naturalH * gridScale,
            position: 'relative',
            flexShrink: 0,
          }}
        >
          <Box
            sx={{
              transform: `scale(${gridScale})`,
              transformOrigin: 'top left',
              position: 'absolute',
              top: 0,
              left: 0,
            }}
          >
            <OuterArea style={{ padding: CELL_STRIDE }}>
              <OuterExtensionOverlays />
              <GridBackground
                onMouseDown={(e: React.MouseEvent) => {
                  e.stopPropagation()
                }}
              >
                <ImageCanvases image={image} />
                <ExtensionUnderlays />
                <ExtensionOverlays />
                <ConflictArrowOverlay />
                <SudokuGrid
                  style={{
                    padding: GRID_PAD,
                    gridTemplateColumns: `repeat(${gridConfig.cols}, auto)`,
                    gridTemplateRows: `repeat(${gridConfig.rows}, auto)`,
                  }}
                >
                  {gridIndices.map(([row, column]) => (
                    <GridCell
                      select={select}
                      key={stringIndex(row, column)}
                      row={row}
                      column={column}
                      imageLoaded={imageLoaded}
                    />
                  ))}
                </SudokuGrid>
              </GridBackground>
            </OuterArea>
          </Box>
        </Box>
        {!isCompact && (
          <Box ref={padRef} sx={{ flexShrink: 0 }}>
            <InputPad selection={selection} compact={false} />
          </Box>
        )}
      </GridContainer>
      {isCompact && <InputPad selection={selection} compact={true} />}
    </Container>
  )
}
