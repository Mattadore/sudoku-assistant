import * as React from 'react'
import { useMemo } from 'react'
import emoStyled from '@emotion/styled'
import { styled } from '@mui/material/styles'
import { Typography } from '@mui/material'
import { useGameStore } from '../stores/gameStore'
import { useExtensionStore } from '../stores/extensionStore'
import { useNetworkStore } from '../stores/networkStore'
import { useUIStore } from '../stores/uiStore'
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

const ConflictHighlightOverlay = emoStyled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(172, 50, 53, 0.2);
  z-index: 205;
  pointer-events: none;
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
    const conflictData = useExtensionStore(
      (s) => s.conflictMatrix[row]?.[column],
    )

    // Conflict highlight (is another cell with a conflict pointing at us?)
    const isConflictHighlighted = useUIStore((s) =>
      s.conflictHighlightSet.has(index),
    )

    // Collect all users selecting this cell (for multi-user dot ring)
    const selectingUserColors = useNetworkStore((s) => {
      const colors: string[] = []
      if (s.myUserdata.selectedIndices.includes(index)) {
        colors.push(s.myUserdata.color)
      }
      for (const key of Object.keys(s.multiUserdata)) {
        if (key === s.onlineId) continue
        const ud = s.multiUserdata[key]
        if (ud?.selectedIndices?.includes(index)) colors.push(ud.color)
      }
      return colors
    })

    // Selector crosshair — local user only
    const mySelectorIndex = useNetworkStore((s) => s.myUserdata.selectorIndex)
    const myColor = useNetworkStore((s) => s.myUserdata.color)
    const selectorColor = mySelectorIndex === index ? myColor : null

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
          style={
            data.color.length === 0
              ? { backgroundColor: imageLoaded ? '#00000000' : '#ffffff' }
              : data.color.length === 1
              ? { backgroundColor: data.color[0] }
              : {
                  background: `conic-gradient(from 0deg, ${data.color
                    .map(
                      (c, i) =>
                        `${c} ${(i * 360) / data.color.length}deg ${
                          ((i + 1) * 360) / data.color.length
                        }deg`,
                    )
                    .join(', ')})`,
                }
          }
        />
        {isConflictHighlighted && <ConflictHighlightOverlay />}
        <NumbersContainer>
          <CentralNumberContainer
            style={
              !data.number
                ? { fontSize: '1.5rem' }
                : data.number && data.fixed
                ? { color: '#171717', fontSize: '4.3rem' }
                : conflictList.includes(data.number)
                ? { color: '#AC3235' }
                : {}
            }
            className="noselect"
          >
            {data.number
              ? data.number
              : data.center.numbers.map((num) => (
                  <NumberAnnotation
                    key={num}
                    num={num}
                    conflicts={conflictList}
                  />
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
          {selectingUserColors.length === 1 && (
            <GridSelectedCircle
              style={{ backgroundColor: selectingUserColors[0] }}
            />
          )}
          {selectingUserColors.length > 1 && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                zIndex: -500,
                pointerEvents: 'none',
              }}
            >
              {selectingUserColors.map((color, i) => {
                const count = selectingUserColors.length
                const dotSize = Math.max(10, 18 - count * 2)
                const radius = 18
                const angle = (2 * Math.PI * i) / count - Math.PI / 2
                const x = Math.cos(angle) * radius
                const y = Math.sin(angle) * radius
                return (
                  <div
                    key={`${color}-${i}`}
                    style={{
                      position: 'absolute',
                      width: dotSize,
                      height: dotSize,
                      borderRadius: '50%',
                      backgroundColor: color,
                      transform: `translate(${x - dotSize / 2}px, ${
                        y - dotSize / 2
                      }px)`,
                    }}
                  />
                )
              })}
            </div>
          )}

          {!data.number && (
            <>
              <HintNumberTopLeft className="noselect">
                {data.topLeftCorner.numbers.map((num) => (
                  <NumberAnnotation
                    key={num}
                    num={num}
                    conflicts={conflictList}
                  />
                ))}
                {data.topLeftCorner.letters.join('')}
              </HintNumberTopLeft>
              <HintNumberBottomRight className="noselect">
                {data.bottomRightCorner.numbers.map((num) => (
                  <NumberAnnotation
                    key={num}
                    num={num}
                    conflicts={conflictList}
                  />
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
