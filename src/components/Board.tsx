import * as React from 'react'
import { useEffect } from 'react'
import emoStyled from '@emotion/styled'
import { styled } from '@mui/material/styles'
import { Box, Container } from '@mui/material'
import { useGameStore } from '../stores/gameStore'
import { useNetworkStore } from '../stores/networkStore'
import { useExtensionStore } from '../stores/extensionStore'
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
  const overlays = Object.values(extensions)
    .filter((ext) => ext.getBoardOverlay)
    .map((ext) => (
      <React.Fragment key={ext.extensionName}>
        {ext.getBoardOverlay!(boardState, CELL_SIZE)}
      </React.Fragment>
    ))
  return overlays.length > 0 ? <>{overlays}</> : null
})

export const Board: React.FC = () => {
  const image = useNetworkStore((s) => s.image)
  const imageLoaded = !!image.imageData
  const selection = useSelection()
  const { select } = selection

  useKeyboardHandler(selection)

  // Deselect keyboard focus when clicking outside the grid
  useEffect(() => {
    if (typeof window === 'undefined') return
    const pageClicked = () => {
      useNetworkStore.getState().updateUserdata({ selectorIndex: null })
    }
    window.addEventListener('mousedown', pageClicked)
    return () => window.removeEventListener('mousedown', pageClicked)
  }, [])

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
      </GridContainer>
    </Container>
  )
}
