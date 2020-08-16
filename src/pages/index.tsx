import * as React from 'react'
import Link from 'gatsby-link'
import { useState, useEffect, useRef } from 'react'
import { graphql } from 'gatsby'
import { CompactPicker } from 'react-color'
import styled from '@emotion/styled'
import produce from 'immer'

// to generate all types from graphQL schema
interface IndexPageProps {
  data: {
    site: {
      siteMetadata: {
        title: string
      }
    }
  }
}

// localStorage.setItem('states', [
//   Array(81)
//     .fill(1)
//     .map((value) => ({
//       number: null,
//       center: [],
//       corner: [],
//       color: '#ffffff',
//     })),
// ])
// function invertHex(hex: string): string {
//   return (Number(`0x1${hex}`) ^ 0xffffff).toString(16).substr(1).toUpperCase()
// }

const SudokuImageCanvas = styled.canvas`
  position: absolute;
  width: 100%;
  height: 100%;
  flex: 1;
  top: -0.8px;
  left: -0.8px;
  pointer-events: none;
  z-index: 200;
`

const SudokuGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(9, auto);
  grid-template-rows: repeat(9, auto);
`

const GridContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
`

const GridBackground = styled.div`
  position: relative;
  margin: 0;

  padding: 2.5px;
  background-color: #000000;
  z-index: 0;
  display: flex;
`

const GridCellStyle = styled.div`
  width: 5rem;
  height: 5rem;
  /* z-index: -; */
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

const CentralNumberContainer = styled.div`
  font-size: 3rem;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  display: flex;
`

const NumbersContainer = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  z-index: 5000;
`

const GridCellHighlightedUp = styled.div`
  z-index: 200;
  /* left: calc(50% - 1.25px); */
  /* top: calc(100% - 10px); */
  left: calc(50% - 2px);
  top: -15px;
  width: 4px;
  height: 15px;
  position: absolute;
  background-color: #ddaa00;
`

interface CellData {
  number: number | null
  center: Array<number>
  corner: Array<number>
  color: string
}

interface GridCellProps {
  index: number
  data: CellData
  selected: boolean
  onClick: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
  cellGap?: string
  boxGap?: string
}

const GridCell: React.FC<GridCellProps> = ({
  index,
  data,
  selected,
  onClick,
  cellGap = '1px',
  boxGap = '2.5px',
}) => {
  const column = index % 9
  const row = Math.floor(index / 9)

  return (
    <GridCellStyle
      onClick={onClick}
      style={{
        backgroundColor: data.color,
        marginLeft: column % 3 === 0 ? boxGap : cellGap,
        marginRight: column % 3 === 2 ? boxGap : cellGap,
        marginTop: row % 3 === 0 ? boxGap : cellGap,
        marginBottom: row % 3 === 2 ? boxGap : cellGap,
      }}
    >
      {/* <GridCellHighlightedStyle /> */}
      <NumbersContainer>
        <CentralNumberContainer className="noselect">
          {data.number}
        </CentralNumberContainer>
        {selected && (
          <>
            <GridCellHighlightedUp />
            <GridCellHighlightedAcross />
            <GridCellHighlightedUp
              style={{
                top: '5rem',
              }}
            />
            <GridCellHighlightedAcross
              style={{
                left: '5em',
              }}
            />
          </>
        )}
      </NumbersContainer>
      {index}
    </GridCellStyle>
  )
}
function getPixel(imgData: ImageData, index: number) {
  return imgData.data.slice(index * 4, index * 4 + 4)
}

const preprocessImage = (imageData: ImageData) => {
  const canvas: HTMLCanvasElement = document.getElementById(
    'sudoku-image',
  ) as HTMLCanvasElement

  const rows = Array(imageData.height).fill(0)
  const columns = Array(imageData.width).fill(0)
  let trimLeft = 0,
    trimRight = 0,
    trimUp = 0,
    trimDown = 0

  let newData: Uint8ClampedArray = new Uint8ClampedArray([...imageData.data])

  // let newData: Uint8ClampedArray = new Uint8ClampedArray([...imageData.data])
  // console.log(newData)

  for (let index = 0; index < imageData.data.length / 4; ++index) {
    const x = index % imageData.width
    const y = Math.floor(index / imageData.width)
    const pixelData = getPixel(imageData, index)
    const intensity = (pixelData[0] + pixelData[1] + pixelData[2]) / 3
    if (intensity < 20) {
      //is blak
      columns[x] = ++columns[x]
      rows[y] = ++rows[y]
    } else if (intensity > 230) {
      //is whit
      newData[index * 4 + 3] = 0
    }
  }

  const rowMax = Math.max(...rows)
  const columnMax = Math.max(...columns)

  const leftEdge = columns.findIndex((value) => value > columnMax * 0.8)
  const rightEdge =
    columns.length -
    1 -
    columns.reverse().findIndex((value) => value > columnMax * 0.8)

  const topEdge = rows.findIndex((value) => value > rowMax * 0.8)
  const bottomEdge =
    rows.length - 1 - rows.reverse().findIndex((value) => value > rowMax * 0.8)

  console.log(leftEdge, rightEdge, topEdge, bottomEdge)
  // for (trimUp = 0; trimUp < rows.length; ++trimUp) {
  //   if (rows[trimUp] > 0) {
  //     break
  //   }
  // }

  // for (trimDown = rows.length - 1; trimDown > 0; --trimDown) {
  //   if (rows[trimDown] > 0) {
  //     break
  //   }
  // }

  // for (trimLeft = 0; trimLeft < columns.length; ++trimLeft) {
  //   if (columns[trimLeft] > 0) {
  //     break
  //   }
  // }

  // for (trimRight = columns.length - 1; trimRight > 0; --trimRight) {
  //   if (columns[trimRight] > 0) {
  //     break
  //   }
  // }

  // console.log(trimLeft, trimRight, trimUp, trimDown)

  // let trimmedData: Array<number> = []
  // for (let row = trimUp; row <= trimDown; ++row) {
  //   trimmedData = trimmedData.concat([
  //     ...newData.slice(
  //       row * 4 * imageData.width + trimLeft * 4,
  //       row * 4 * imageData.width + (trimRight + 1) * 4,
  //     ),
  //   ])
  // }

  // console.log(trimmedData)
  const newImageData = new ImageData(
    new Uint8ClampedArray(newData),
    imageData.width,
  )
  canvas.height = newImageData.height
  canvas.width = newImageData.width
  canvas.getContext('2d').putImageData(
    newImageData,
    0,
    0,
    // trimLeft,
    // trimUp,
    // trimRight - trimLeft,
    // trimDown - trimUp,
  )

  // console.log(newImageData.width, newImageData.height)
  return [leftEdge, rightEdge, topEdge, bottomEdge]
}

export default (props: IndexPageProps, context: any) => {
  const [selectedIndex, setSelectedIndex] = useState(null)
  // const
  const states = useRef<Array<Array<CellData>>>([
    Array(81)
      .fill(1)
      .map((value) => ({
        number: null,
        center: [],
        corner: [],
        color: '#ffffff',
      })),
  ])

  const [image, setImage] = useState<{
    leftEdge: number
    rightEdge: number
    topEdge: number
    bottomEdge: number
    imageData: ImageData | null
  }>({ leftEdge: 0, rightEdge: 0, topEdge: 0, bottomEdge: 0, imageData: null })
  const [boardStateIndex, setBoardStateIndex] = useState(0)
  // const cells = localStorage.states[boardStateIndex]
  const cells = states.current[boardStateIndex]

  const updateBoard = (update: (method: Array<CellData>) => void): void => {
    const out = produce(cells, (cellsDraft: Array<CellData>) => {
      update(cellsDraft)
    })
    states.current.splice(boardStateIndex + 1, states.current.length)
    states.current.push(out)

    setBoardStateIndex(boardStateIndex + 1)
  }

  useEffect(() => {
    const keyCallback = (event: any) => {
      // Use regex to test if digit btwn 1-9
      if (/[1-9]/.test(event.key) && selectedIndex) {
        // setCells((cells) => {
        //   let newCells = [...cells]
        //   newCells[selectedIndex].number = parseInt(event.key)
        //   return newCells
        // })
        updateBoard((data) => {
          data[selectedIndex].number = parseInt(event.key)
        })
        //if it is a digit
        return
      }

      switch (event.key) {
        case 'y':
          if (boardStateIndex < states.current.length - 1) {
            setBoardStateIndex(boardStateIndex + 1)
          }
          break
        case 'z':
          if (boardStateIndex > 0) {
            setBoardStateIndex(boardStateIndex - 1)
          }
          break
        case 'ArrowLeft':
          if (selectedIndex % 9 > 0) {
            setSelectedIndex(selectedIndex - 1)
          }
          break
        case 'ArrowRight':
          if (selectedIndex % 9 < 8) {
            setSelectedIndex(selectedIndex + 1)
          }
          break
        case 'ArrowUp':
          if (selectedIndex > 8) {
            setSelectedIndex(selectedIndex - 9)
          }
          break
        case 'ArrowDown':
          if (selectedIndex < 72) {
            setSelectedIndex(selectedIndex + 9)
          }
          break
      }
    }

    document.addEventListener('keydown', keyCallback)
    return () => {
      document.removeEventListener('keydown', keyCallback)
    }
  }, [selectedIndex, boardStateIndex])

  const fileLoad: (event: React.ChangeEvent<HTMLInputElement>) => void = (
    event,
  ) => {
    if (event.target.files.length) {
      const file = event.target.files[0]
      const canvas = document.getElementById(
        'sudoku-image',
      ) as HTMLCanvasElement
      // const drawCanvas = document.createElement('canvas')
      const image = new Image()
      const url = URL.createObjectURL(file)
      image.src = url

      image.onload = function () {
        URL.revokeObjectURL(url)
        const context = canvas.getContext('2d')
        canvas.width = image.width
        canvas.height = image.height
        context.drawImage(image, 0, 0)
        const imageData = context.getImageData(
          0,
          0,
          canvas.width,
          canvas.height,
        )
        const [leftEdge, rightEdge, topEdge, bottomEdge] = preprocessImage(
          imageData,
        )
        setImage({ leftEdge, rightEdge, topEdge, bottomEdge, imageData })
      }
    }
  }

  return (
    <div>
      <CompactPicker
        color={selectedIndex ? cells[selectedIndex].color : '#000000'}
        onChangeComplete={(color) => {
          // setColor(color.hex)
          updateBoard((data) => {
            data[selectedIndex].color = color.hex
          })
        }}
      />
      <input type="file" id="upload-button" onChange={fileLoad} />
      <GridContainer>
        <GridBackground>
          {/* 
            box dimensions: 662*662 browser px
            imagedata: 

          
          */}
          <SudokuImageCanvas
            id="sudoku-image"
            style={{
              width: image.imageData
                ? `${
                    (100 * image.imageData.width) /
                    (image.rightEdge - image.leftEdge)
                  }%`
                : '100%',
            }}
          />
          {/* <SudokuImafno */}
          {states.current[boardStateIndex] && (
            <SudokuGrid>
              {(states.current[boardStateIndex] as Array<CellData>).map(
                (cell, index) => (
                  <GridCell
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      console.log('CLICK')
                      setSelectedIndex(index)
                    }}
                    key={index}
                    selected={selectedIndex === index}
                    data={cell}
                    index={index}
                  />
                ),
              )}
            </SudokuGrid>
          )}
        </GridBackground>
      </GridContainer>
    </div>
  )
}

export const pageQuery = graphql`
  query IndexQuery {
    site {
      siteMetadata {
        title
      }
    }
  }
`
