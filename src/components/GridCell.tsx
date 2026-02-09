import * as React from 'react'
import { useMemo } from 'react'
import emoStyled from '@emotion/styled'
import { styled } from '@mui/material/styles'
import { Typography } from '@mui/material'
import { useGameStore } from '../stores/gameStore'
import { useExtensionStore } from '../stores/extensionStore'
import { useNetworkStore } from '../stores/networkStore'
import { stringIndex } from 'helper'

const GridCellStyle = emoStyled.div`
  width: 5rem;
  height: 5rem;
`

const GridCellBackground = emoStyled.div`
  position: relative;
  width: 100%;
  height: 100%;
  z-index: 210;
`

const GridCellHighlightedAcross = emoStyled.div`
  z-index: 500;
  top: calc(50% - 2px);
  left: -15px;
  width: 15px;
  height: 4px;
  position: absolute;
  background-color: #ddaa00;
`

const GridSelectedCircle = emoStyled.div`
  position: absolute;
  z-index: -500;
  background-color: #ffcc00;
  top: calc(50% - 0.75rem);
  left: calc(50% - 0.75rem);
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
`

const CentralNumberContainer = styled(Typography)`
  z-index: 5000;
  font-size: 4rem;
  color: #00ccff;
  font-weight: bold;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  display: flex;
`

const NumbersContainer = emoStyled.div`
  position: relative;
  top: -100%;
  width: 100%;
  height: 100%;
  z-index: 5000;
`

const GridCellHighlightedUp = emoStyled.div`
  z-index: 500;
  left: calc(50% - 2px);
  top: -15px;
  width: 4px;
  height: 15px;
  position: absolute;
  background-color: #ddaa00;
`

const HintNumberTopLeft = styled(Typography)`
  position: absolute;
  z-index: 2000;
  color: #00ccff;
  top: 3px;
  left: 3px;
  font-weight: bold;
  font-size: 1rem;
`

const HintNumberBottomRight = styled(Typography)`
  position: absolute;
  z-index: 2000;
  color: #00ccff;
  bottom: 3px;
  right: 3px;
  font-weight: bold;
  font-size: 1rem;
`

interface GridCellProps {
  row: number
  column: number
  imageLoaded: boolean
  select: (
    index: string,
    event: KeyboardEvent | React.MouseEvent<HTMLDivElement, MouseEvent>,
    multi?: boolean,
  ) => void
}

const NumberAnnotation: React.FC<{
  num: number
  conflicts: number[]
}> = ({ num, conflicts }) => (
  <span
    style={
      conflicts.includes(num)
        ? { color: '#AC3235', display: 'inline-block' }
        : { display: 'inline-block' }
    }
  >
    {num}
  </span>
)

export const GridCell: React.FC<GridCellProps> = React.memo(
  ({ row, column, imageLoaded, select }) => {
    const index = stringIndex(row, column)
    const boxGap = imageLoaded ? '1px' : '2px'
    const cellGap = imageLoaded ? '0px' : '1px'

    // Granular selectors — only re-render when THIS cell's data changes
    const data = useGameStore((s) => s.gameState.boardState[row][column])
    const conflictData = useExtensionStore((s) => s.conflictMatrix[row]?.[column])

    // Granular userdata selectors
    const mySelectedIndices = useNetworkStore(
      (s) => s.myUserdata.selectedIndices,
    )
    const mySelectorIndex = useNetworkStore((s) => s.myUserdata.selectorIndex)
    const myColor = useNetworkStore((s) => s.myUserdata.color)

    // For multi-user: extract only what this cell needs
    const otherUserColor = useNetworkStore((s) => {
      for (const key of Object.keys(s.multiUserdata)) {
        if (key === s.onlineId) continue
        const ud = s.multiUserdata[key]
        if (ud?.selectedIndices?.includes(index)) return ud.color
      }
      return null
    })
    const otherSelectorColor = useNetworkStore((s) => {
      for (const key of Object.keys(s.multiUserdata)) {
        if (key === s.onlineId) continue
        if (s.multiUserdata[key]?.selectorIndex === index)
          return s.multiUserdata[key].color
      }
      return null
    })

    // Memoize derived values
    const selectedColor = useMemo(() => {
      if (mySelectedIndices.includes(index)) return myColor
      return otherUserColor
    }, [mySelectedIndices, index, myColor, otherUserColor])

    const selectorColor = useMemo(() => {
      if (mySelectorIndex === index) return myColor
      return otherSelectorColor
    }, [mySelectorIndex, index, myColor, otherSelectorColor])

    const conflictList = useMemo(() => {
      if (!conflictData) return []
      const list: number[] = []
      for (let num = 1; num <= conflictData.conflicts.length; ++num) {
        if (conflictData.conflicts[num - 1].length > 0) {
          if (
            data.number === num ||
            data.center.numbers.includes(num) ||
            data.topLeftCorner.numbers.includes(num) ||
            data.bottomRightCorner.numbers.includes(num)
          ) {
            list.push(num)
          }
        }
      }
      return list
    }, [conflictData, data])

    return (
      <GridCellStyle
        onMouseDown={(e) => {
          e.preventDefault()
          select(index, e)
        }}
        onMouseEnter={(e) => {
          if (e.buttons === 1) {
            e.preventDefault()
            e.stopPropagation()
            select(index, e, true)
          }
        }}
        style={{
          marginLeft: column % 3 === 0 ? boxGap : cellGap,
          marginRight: column % 3 === 2 ? boxGap : cellGap,
          marginTop: row % 3 === 0 ? boxGap : cellGap,
          marginBottom: row % 3 === 2 ? boxGap : cellGap,
        }}
      >
        <GridCellBackground
          style={{
            backgroundColor: data.color
              ? data.color
              : imageLoaded
              ? '#00000000'
              : '#ffffff',
          }}
        />
        <NumbersContainer>
          <CentralNumberContainer
            style={
              !data.number
                ? { fontSize: '1.5rem' }
                : conflictList.includes(data.number)
                ? { color: '#AC3235' }
                : {}
            }
            className="noselect"
          >
            {data.number
              ? data.number
              : data.center.numbers.map((num) => (
                  <NumberAnnotation key={num} num={num} conflicts={conflictList} />
                ))}
            {!data.number && data.center.letters.join('')}
          </CentralNumberContainer>
          {selectorColor && (
            <>
              <GridCellHighlightedUp
                style={{ backgroundColor: selectorColor }}
              />
              <GridCellHighlightedAcross
                style={{ backgroundColor: selectorColor }}
              />
              <GridCellHighlightedUp
                style={{ backgroundColor: selectorColor, top: '5rem' }}
              />
              <GridCellHighlightedAcross
                style={{ backgroundColor: selectorColor, left: '5em' }}
              />
            </>
          )}
          {selectedColor && (
            <GridSelectedCircle
              style={{ backgroundColor: selectedColor }}
            />
          )}

          {!data.number && (
            <>
              <HintNumberTopLeft className="noselect">
                {data.topLeftCorner.numbers.map((num) => (
                  <NumberAnnotation key={num} num={num} conflicts={conflictList} />
                ))}
                {data.topLeftCorner.letters.join('')}
              </HintNumberTopLeft>
              <HintNumberBottomRight className="noselect">
                {data.bottomRightCorner.numbers.map((num) => (
                  <NumberAnnotation key={num} num={num} conflicts={conflictList} />
                ))}
                {data.bottomRightCorner.letters.join('')}
              </HintNumberBottomRight>
            </>
          )}
        </NumbersContainer>
      </GridCellStyle>
    )
  },
)
