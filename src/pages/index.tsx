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
  padding: 1px;
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

  padding: 0px;
  background-color: #000000;
  z-index: 0;
  display: flex;
`

const GridCellStyle = styled.div`
  width: 4rem;
  height: 4rem;
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

const GridSelectedCircle = styled.div`
  position: absolute;
  z-index: -500;
  background-color: #ffcc00;
  top: calc(50% - 1rem);
  left: calc(50% - 1rem);
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
`

const HintNumberTop = styled.div`
  position: absolute;
  z-index: 2000;
  top: 3px;
  left: 3px;
  font-size: 12px;
  font-weight: bold;
`

const CentralNumberContainer = styled.div`
  /* font-weight: bold; */
  z-index: 5000;
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
  z-index: 500;
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
  selector: boolean
  selected: boolean
  onMouseDown: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
  onMouseEnter: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
  cellGap?: string
  boxGap?: string
}

const GridCell: React.FC<GridCellProps> = ({
  index,
  data,
  selected,
  selector,
  onMouseDown,
  onMouseEnter,
  cellGap = '0px',
  boxGap = '1.5px',
}) => {
  const column = index % 9
  const row = Math.floor(index / 9)

  return (
    <GridCellStyle
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
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
        <CentralNumberContainer
          style={!data.number ? { fontSize: 12, fontWeight: 'bold' } : {}}
          className="noselect"
        >
          {data.number ? data.number : data.center.join('')}
        </CentralNumberContainer>
        {selector && (
          <>
            <GridCellHighlightedUp />
            <GridCellHighlightedAcross />
            <GridCellHighlightedUp
              style={{
                top: '4rem',
              }}
            />
            <GridCellHighlightedAcross
              style={{
                left: '4em',
              }}
            />
          </>
        )}
        {selected && (
          <>
            <GridSelectedCircle />
          </>
        )}
        {!data.number && (
          <HintNumberTop className="noselect">
            {data.corner.join('')}
          </HintNumberTop>
        )}
      </NumbersContainer>
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
    } else if (intensity > 215) {
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

  // console.log(leftEdge, rightEdge, topEdge, bottomEdge)

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
  const [selectorIndex, setSelectorIndex] = useState(null)
  const [selectedIndices, setSelectedIndices] = useState([])

  const select = (
    index: number,
    event: KeyboardEvent | React.MouseEvent<HTMLDivElement, MouseEvent>,
    multi = false,
  ) => {
    setSelectorIndex(index)
    if (event.ctrlKey) {
      if (
        typeof selectedIndices.find((value) => value === index) !== 'undefined'
      ) {
        setSelectedIndices((indices) =>
          indices.filter((value) => value !== index),
        )
      }
    } else {
      if (event.shiftKey || multi) {
        if (
          typeof selectedIndices.find((value) => value === index) ===
          'undefined'
        ) {
          setSelectedIndices((indices) => indices.concat(index))
        }
      } else {
        setSelectedIndices([index])
      }
    }
  }

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

  const updateSelected = (update: (cell: CellData) => void): void => {
    updateBoard((cells) => {
      for (let selected in selectedIndices) {
        update(cells[selectedIndices[selected]])
      }
    })
  }

  useEffect(() => {
    const keyCallback = (event: KeyboardEvent) => {
      // Use regex to test if digit btwn 1-9


      event.preventDefault()
      // console.log(event.key)
      if (/[1-9]/.test(event.key) || /[!@#$%^&*(]/.test(event.key) && selectorIndex !== null) {
        // setCells((cells) => {
        //   let newCells = [...cells]
        //   newCells[selectorIndex].number = parseInt(event.key)
        //   return newCells
        // })
        if (event.altKey) {
          updateSelected((cell) => {
            if (!cell.corner.includes(parseInt(event.key))) {
              cell.corner.push(parseInt(event.key))
              cell.corner.sort()
            } else {
              cell.corner = cell.corner.filter(
                (value) => parseInt(event.key) !== value,
              )
              cell.corner.sort()
            }
          })
        } else if (event.shiftKey) {
          let convertShift = ['!', '@', '#', '$', '%', '^', '&', '*', '('];
          let shiftedKey = convertShift.indexOf(event.key) + 1
          updateSelected((cell) => {
            if (!cell.center.includes(shiftedKey)) {
              cell.center.push(shiftedKey)
              cell.center.sort()
            } else {
              cell.center = cell.center.filter(
                (value) => shiftedKey !== value,
              )
              cell.center.sort()
            }
          })
        } else {
          updateSelected((cell) => {
            if (cell.number !== parseInt(event.key)) {
              cell.number = parseInt(event.key)
            } else {
              cell.number = null
            }
          })
        }
        //if it is a digit
        return
      }

      else if (/[1-9]/.test(event.key) && selectorIndex !== null && event.ctrlKey) {
        updateSelected((cell) => {
          let addInt = parseInt(event.key)
          if (!cell.center.includes(addInt)) {
            cell.center.push(addInt)
            cell.center.sort()
          }
          // else {
          // while (let i = 0; i < cell.center.length; ++i)

          //cell.center.remove(addInt)
          //}

        })
        return
      }

      switch (event.key) {
        case 'y':
          if (event.ctrlKey && boardStateIndex < states.current.length - 1) {
            setBoardStateIndex(boardStateIndex + 1)
          }
          break
        case 'z':
          if (event.ctrlKey && boardStateIndex > 0) {
            setBoardStateIndex(boardStateIndex - 1)
          }
          break
        case 'ArrowLeft':
          if (selectorIndex % 9 > 0) {
            select(selectorIndex - 1, event)
          }
          break
        case 'ArrowRight':
          if (selectorIndex % 9 < 8) {
            select(selectorIndex + 1, event)
          }
          break
        case 'ArrowUp':
          if (selectorIndex > 8) {
            select(selectorIndex - 9, event)
          }
          break
        case 'ArrowDown':
          if (selectorIndex < 72) {
            select(selectorIndex + 9, event)
          }
          break
        case 'Delete':
          updateSelected((cell) => {
            cell.number = null
          })
          break
      }
    }

    document.addEventListener('keydown', keyCallback)
    return () => {
      document.removeEventListener('keydown', keyCallback)
    }
  }, [selectorIndex, selectedIndices, boardStateIndex])

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
        color={selectorIndex ? cells[selectorIndex].color : '#000000'}
        onChangeComplete={(color) => {
          // setColor(color.hex)
          updateSelected((cell) => {
            cell.color = color.hex
          })
        }}
      />
      <input type="file" id="upload-button" onChange={fileLoad} />
      <GridContainer>
        <GridBackground
          style={image.imageData ? { backgroundColor: '#ffffff' } : {}}
        >
          {/* 
            box dimensions: 662*662 browser px
            imagedata: 

          
          */}
          <SudokuImageCanvas
            id="sudoku-image"
            style={{
              left: image.imageData
                ? `-${
                (100 * image.leftEdge) /
                (image.rightEdge - image.leftEdge + 1)
                }%`
                : '0px',
              top: image.imageData
                ? `-${
                (100 * image.topEdge) /
                (image.bottomEdge - image.topEdge + 1)
                }%`
                : '0px',
              width: image.imageData
                ? `${
                (100 * image.imageData.width) /
                (image.rightEdge - image.leftEdge + 1)
                }%`
                : '100%',
              height: image.imageData
                ? `${
                (100 * image.imageData.height) /
                (image.bottomEdge - image.topEdge + 1)
                }%`
                : '100%',
            }}
          />
          {/* <SudokuImafno */}
          {states.current[boardStateIndex] && (
            <SudokuGrid style={{ padding: image.imageData ? '1px' : '2px' }}>
              {(states.current[boardStateIndex] as Array<CellData>).map(
                (cell, index) => (
                  <GridCell
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      console.log('CLICK')
                      select(index, e)
                    }}
                    onMouseEnter={(e) => {
                      if (e.buttons === 1) {
                        e.preventDefault()
                        e.stopPropagation()
                        select(index, e, true)
                      }
                    }}
                    boxGap={image.imageData ? '1px' : '2px'}
                    cellGap={image.imageData ? '0px' : '1px'}
                    key={index}
                    selected={
                      // Check if in the list
                      typeof selectedIndices.find((i) => i === index) !==
                      'undefined'
                    }
                    selector={selectorIndex === index}
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
