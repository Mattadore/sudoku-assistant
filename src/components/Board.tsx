import * as React from 'react'
import { useEffect, useMemo } from 'react' // useMemo used by ConflictArrowOverlay
import emoStyled from '@emotion/styled'
import { styled } from '@mui/material/styles'
import { Box, Chip, Container } from '@mui/material' // Chip used for conflict mode indicator
import { useGameStore } from '../stores/gameStore'
import { useNetworkStore } from '../stores/networkStore'
import { useExtensionStore } from '../stores/extensionStore'
import { useUIStore } from '../stores/uiStore'
import { splitIndex, extensionColor } from 'helper'
import {
  cellCenter,
  gridViewBox,
  overlayStyle,
} from '../solver-extensions/svgHelpers'
import { GridCell } from './GridCell'
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
  padding: 1px;
  display: grid;
  grid-template-columns: repeat(9, auto);
  grid-template-rows: repeat(9, auto);
`

const GridContainer = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  user-select: none;
  cursor: default;
`

const GridBackground = styled(Box)`
  position: relative;
  margin: 0;
  padding: 0px;
  background-color: #000000;
  z-index: 0;
`

const ImageCanvases = React.memo(
  ({ image }: { image: SudokuImageData }) => (
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
  ),
)

// Cell size in px (matches GridCell 5rem = 80px at default font size)
const CELL_SIZE = 80

// Static 9x9 grid indices — never changes, avoids recreating on every render
const GRID_INDICES: [number, number][] = []
for (let row = 0; row < 9; row++) {
  for (let col = 0; col < 9; col++) {
    GRID_INDICES.push([row, col])
  }
}

const ExtensionOverlays: React.FC = React.memo(() => {
  const extensions = useExtensionStore((s) => s.extensions)
  const boardState = useGameStore((s) => s.gameState.boardState)
  const disabledExtensions = useUIStore((s) => s.disabledExtensions)
  const overlays = Object.values(extensions)
    .filter(
      (ext) => ext.getBoardOverlay && !disabledExtensions.has(ext.extensionName),
    )
    .map((ext) => (
      <React.Fragment key={ext.extensionName}>
        {ext.getBoardOverlay!(boardState, CELL_SIZE)}
      </React.Fragment>
    ))
  return overlays.length > 0 ? <>{overlays}</> : null
})

const ConflictArrowOverlay: React.FC = React.memo(() => {
  const conflictMode = useUIStore((s) => s.conflictMode)
  const selectorIndex = useNetworkStore((s) => s.myUserdata.selectorIndex)

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
      viewBox={gridViewBox(CELL_SIZE)}
      style={{ ...overlayStyle(), zIndex: 600 }}
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
  const selection = useSelection()
  const { select } = selection

  useKeyboardHandler(selection)

  // Compute conflict highlights when selector changes
  const selectorIndex = useNetworkStore((s) => s.myUserdata.selectorIndex)
  useEffect(() => {
    if (!selectorIndex) {
      useUIStore.getState().setConflictHighlights([])
      return
    }
    const [row, col] = splitIndex(selectorIndex)
    const cellData = useGameStore.getState().gameState.boardState[row]?.[col]
    const conflictData =
      useExtensionStore.getState().conflictMatrix[row]?.[col]
    if (!conflictData || !cellData?.number) {
      useUIStore.getState().setConflictHighlights([])
      return
    }
    const conflicting = conflictData.conflicts[cellData.number - 1]
    const indices = conflicting
      .map(([r, c]) => `${r},${c}`)
      .filter((idx) => idx !== selectorIndex)
    useUIStore.getState().setConflictHighlights(indices)
  }, [selectorIndex])

  // Also recompute when board state changes at the selected cell
  const selectedCellNumber = useGameStore((s) => {
    if (!selectorIndex) return null
    const [row, col] = splitIndex(selectorIndex)
    return s.gameState.boardState[row]?.[col]?.number ?? null
  })
  useEffect(() => {
    if (!selectorIndex || !selectedCellNumber) {
      useUIStore.getState().setConflictHighlights([])
      return
    }
    const [row, col] = splitIndex(selectorIndex)
    const conflictData =
      useExtensionStore.getState().conflictMatrix[row]?.[col]
    if (!conflictData) return
    const conflicting = conflictData.conflicts[selectedCellNumber - 1]
    const indices = conflicting
      .map(([r, c]) => `${r},${c}`)
      .filter((idx) => idx !== selectorIndex)
    useUIStore.getState().setConflictHighlights(indices)
  }, [selectorIndex, selectedCellNumber])

  // Deselect keyboard focus when clicking outside the grid
  useEffect(() => {
    if (typeof window === 'undefined') return
    const pageClicked = () => {
      useNetworkStore.getState().updateUserdata({ selectorIndex: null })
    }
    window.addEventListener('mousedown', pageClicked)
    return () => window.removeEventListener('mousedown', pageClicked)
  }, [])

  const conflictMode = useUIStore((s) => s.conflictMode)

  return (
    <Container>
      <GridContainer>
        <GridBackground
          onMouseDown={(e: React.MouseEvent) => {
            e.stopPropagation()
          }}
        >
          <ImageCanvases image={image} />
          <ExtensionOverlays />
          <ConflictArrowOverlay />
          <SudokuGrid style={{ padding: imageLoaded ? '1px' : '2px' }}>
            {GRID_INDICES.map(([row, column]) => (
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
        {conflictMode && (
          <Chip
            label="Conflict Mode"
            size="small"
            color="warning"
            sx={{ position: 'absolute', bottom: 12, left: 12 }}
          />
        )}
      </GridContainer>
    </Container>
  )
}
