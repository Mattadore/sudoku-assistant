import * as React from 'react'

import styled from '@emotion/styled'

const GridCellStyle = styled.div`
  width: 5rem;
  height: 5rem;
`

const GridCellBackground = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  z-index: 210;
`

const GridCellHighlightedAcross = styled.div`
  z-index: 500;
  top: calc(50% - 2px);
  left: -15px;
  width: 15px;
  height: 4px;
  position: absolute;
  background-color: #ddaa00;
`

const GridSelectedCircle = styled.div`
  position: absolute;
  z-index: -500;
  background-color: #ffcc00;
  top: calc(50% - 0.75rem);
  left: calc(50% - 0.75rem);
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
`

const CentralNumberContainer = styled.div`
  z-index: 5000;
  font-size: 3rem;
  color: #00ccff;
  font-weight: bold;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  display: flex;
`

const NumbersContainer = styled.div`
  position: relative;
  top: -100%;
  width: 100%;
  height: 100%;
  z-index: 5000;
`

const GridCellHighlightedUp = styled.div`
  z-index: 500;
  left: calc(50% - 2px);
  top: -15px;
  width: 4px;
  height: 15px;
  position: absolute;
  background-color: #ddaa00;
`

const HintNumberTopLeft = styled.div`
  position: absolute;
  z-index: 2000;
  color: #00ccff;
  top: 3px;
  left: 3px;
  font-weight: bold;
`

const HintNumberBottomRight = styled.div`
  position: absolute;
  z-index: 2000;
  color: #00ccff;
  bottom: 3px;
  right: 3px;
  font-weight: bold;
`

interface GridCellProps {
  index: string
  imageLoaded: boolean
  data: CellData
  selectorColor: string | null
  selectedColor: string | null
  select: (
    index: string,
    event: KeyboardEvent | React.MouseEvent<HTMLDivElement, MouseEvent>,
    multi?: boolean,
  ) => void
  cellGap?: string
  boxGap?: string
  conflict: ConflictData
}

export const GridCell: React.FC<GridCellProps> =
  /*React.memo*/
  ({
    index,
    imageLoaded,
    data,
    selectedColor,
    selectorColor,
    select,
    cellGap = '0px',
    boxGap = '1.5px',
    conflict,
  }) => {
    const [row, column] = index.split(',').map((i) => parseInt(i))
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
                ? { fontSize: 16 }
                : conflict.conflicts[data.number - 1].length > 0
                ? { color: '#AC3235' }
                : {}
            }
            className="noselect"
          >
            {data.number ? data.number : data.center.numbers.join('')}
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
                style={{
                  backgroundColor: selectorColor,
                  top: '5rem',
                }}
              />
              <GridCellHighlightedAcross
                style={{
                  backgroundColor: selectorColor,
                  left: '5em',
                }}
              />
            </>
          )}
          {selectedColor && (
            <>
              <GridSelectedCircle style={{ backgroundColor: selectedColor }} />
            </>
          )}

          {!data.number && (
            <>
              <HintNumberTopLeft className="noselect" style={{ fontSize: 16 }}>
                {data.topLeftCorner.numbers.join('')}
                {data.topLeftCorner.letters.join('')}
              </HintNumberTopLeft>
              <HintNumberBottomRight
                className="noselect"
                style={{ fontSize: 16 }}
              >
                {data.bottomRightCorner.numbers.join('')}
                {data.bottomRightCorner.letters.join('')}
              </HintNumberBottomRight>
            </>
          )}
        </NumbersContainer>
      </GridCellStyle>
    )
  }
