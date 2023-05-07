import * as React from 'react'

import emoStyled from '@emotion/styled'
import { styled } from '@mui/material/styles'
import { splitIndex, arraysSame } from '../helper'

import { Typography } from '@mui/material'

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
  index: string
  imageLoaded: boolean
  data: CellData
  myUserdata: Userdata
  multiUserdata: { [key: string]: Userdata }
  onlineId: string
  select: (
    index: string,
    event: KeyboardEvent | React.MouseEvent<HTMLDivElement, MouseEvent>,
    multi?: boolean,
  ) => void
  conflictData: ConflictData
}

// An internal version of GridCell designed to be memoized
interface InternalGridCellProps {
  index: string
  imageLoaded: boolean
  data: CellData
  // myUserdata: Userdata
  // multiUserdata: { [key: string]: Userdata }
  selectedColors: string[]
  selectorColors: string[]
  select: (
    index: string,
    event: KeyboardEvent | React.MouseEvent<HTMLDivElement, MouseEvent>,
    multi?: boolean,
  ) => void
  conflictList: number[]
}

export const GridCell: React.FC<GridCellProps> =
  /*React.memo*/
  ({
    index,
    imageLoaded,
    data,
    myUserdata,
    multiUserdata,
    select,
    conflictData,
    onlineId,
  }) => {
    const conflictList = React.useRef<number[]>([])
    const selectorColors = React.useRef<string[]>([])
    const selectedColors = React.useRef<string[]>([])

    const selectorConnKeys = Object.keys(multiUserdata).filter(
      (key) => key !== onlineId && multiUserdata[key].selectorIndex === index,
    )

    const selectedConnKeys = Object.keys(multiUserdata).filter(
      (key) =>
        key !== onlineId &&
        multiUserdata[key]?.selectedIndices?.includes(index),
    )

    const newSelectedColors = []
    if (myUserdata.selectedIndices.includes(index)) {
      newSelectedColors.push(myUserdata.color)
    } else if (selectedConnKeys.length > 0) {
      newSelectedColors.push(multiUserdata[selectedConnKeys[0]].color)
    }

    const newSelectorColors = []
    if (myUserdata.selectorIndex === index) {
      newSelectorColors.push(myUserdata.color)
    } else if (selectorConnKeys.length > 0) {
      newSelectorColors.push(multiUserdata[selectorConnKeys[0]].color)
    }

    const newConflictList: number[] = []
    for (let num = 1; num <= conflictData.conflicts.length; ++num) {
      if (conflictData.conflicts[num - 1].length > 0) {
        if (
          data.bottomRightCorner.numbers.includes(num) ||
          data.topLeftCorner.numbers.includes(num) ||
          data.center.numbers.includes(num) ||
          data.number === num
        ) {
          newConflictList.push(num)
        }
      }
    }

    if (!arraysSame(newSelectedColors, selectedColors.current)) {
      selectedColors.current = newSelectedColors
    }

    if (!arraysSame(newSelectorColors, selectorColors.current)) {
      selectorColors.current = newSelectorColors
    }

    if (!arraysSame(newConflictList, conflictList.current)) {
      conflictList.current = newConflictList
    }

    return (
      <InternalGridCell
        imageLoaded={imageLoaded}
        index={index}
        data={data}
        select={select}
        conflictList={conflictList.current}
        selectedColors={selectedColors.current}
        selectorColors={selectorColors.current}
      />
    )
  }

const InternalGridCell: React.FC<InternalGridCellProps> = React.memo(
  ({
    index,
    data,
    select,
    imageLoaded,
    selectedColors,
    selectorColors,
    conflictList,
  }) => {
    const [row, column] = splitIndex(index)
    const boxGap = imageLoaded ? '1px' : '2px'
    const cellGap = imageLoaded ? '0px' : '1px'
    return (
      <GridCellStyle
        onMouseDown={(e) => {
          e.preventDefault()
          // e.stopPropagation()
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
        {/* <GridCellHighlightedStyle /> */}
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
            {data.number ? data.number : data.center.numbers.join('')}
            {!data.number && data.center.letters.join('')}
          </CentralNumberContainer>
          {selectorColors.length > 0 && (
            <>
              <GridCellHighlightedUp
                style={{ backgroundColor: selectorColors[0] }}
              />
              <GridCellHighlightedAcross
                style={{ backgroundColor: selectorColors[0] }}
              />
              <GridCellHighlightedUp
                style={{
                  backgroundColor: selectorColors[0],
                  top: '5rem',
                }}
              />
              <GridCellHighlightedAcross
                style={{
                  backgroundColor: selectorColors[0],
                  left: '5em',
                }}
              />
            </>
          )}
          {selectedColors.length > 0 && (
            <>
              <GridSelectedCircle
                style={{ backgroundColor: selectedColors[0] }}
              />
            </>
          )}

          {!data.number && (
            <>
              <HintNumberTopLeft className="noselect">
                {data.topLeftCorner.numbers.join('')}
                {data.topLeftCorner.letters.join('')}
              </HintNumberTopLeft>
              <HintNumberBottomRight className="noselect">
                {data.bottomRightCorner.numbers.join('')}
                {data.bottomRightCorner.letters.join('')}
              </HintNumberBottomRight>
            </>
          )}
        </NumbersContainer>
      </GridCellStyle>
    )
  },
)
