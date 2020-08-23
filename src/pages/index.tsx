import * as React from 'react'
import Link from 'gatsby-link'
import { useState, useEffect, useRef, useCallback } from 'react'
import { graphql } from 'gatsby'
import { CompactPicker } from 'react-color'
import styled from '@emotion/styled'
import produce from 'immer'
import { Divider, Button } from 'semantic-ui-react'
import RichTextEditor from 'react-rte'
import Peer from 'peerjs'

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

const PageContainer = styled.div`
  display: flex;
  width: 100%;
  height: 100vh;
  flex-direction: row;
`

const SidebarContainer = styled.div`
  /* display: flex; */
  /* flex-direction: column; */
  flex: 1;
  max-width: 25rem;
  height: 100%;
  background-color: #ffffff;
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
  background-color: #ddddff;

  /* width: 100%; */
  flex: 1;
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

interface CellDiff {
  number?: number | null
  center?: number[]
  corner?: number[]
  color?: string
}

interface GridCellProps {
  index: number
  data: CellData
  selector: boolean
  multiSelector: boolean
  multiSelected: boolean
  myColor: string
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
  multiSelector,
  multiSelected,
  myColor,
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
        {(selector || multiSelector) && (
          <>
            <GridCellHighlightedUp
              style={{ backgroundColor: multiSelector ? '#3388ff' : myColor }}
            />
            <GridCellHighlightedAcross
              style={{ backgroundColor: multiSelector ? '#3388ff' : myColor }}
            />
            <GridCellHighlightedUp
              style={{
                backgroundColor: multiSelector ? '#3388ff' : myColor,
                top: '5rem',
              }}
            />
            <GridCellHighlightedAcross
              style={{
                backgroundColor: multiSelector ? '#3388ff' : myColor,
                left: '5em',
              }}
            />
          </>
        )}
        {selected && (
          <>
            <GridSelectedCircle
              style={{ backgroundColor: multiSelector ? '#3388ff' : myColor }}
            />
          </>
        )}
        {multiSelected && (
          <>
            <GridSelectedCircle style={{ backgroundColor: '#3388ff' }} />
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

  for (let index = 0; index < imageData.data.length / 4; ++index) {
    const x = index % imageData.width
    const y = Math.floor(index / imageData.width)
    const pixelData = getPixel(imageData, index)
    const intensity = (pixelData[0] + pixelData[1] + pixelData[2]) / 3
    if (intensity < 20) {
      //is blak
      columns[x] = ++columns[x]
      rows[y] = ++rows[y]
    } else if (intensity > 235) {
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

  const newImageData = new ImageData(
    new Uint8ClampedArray(newData),
    imageData.width,
  )
  canvas.height = newImageData.height
  canvas.width = newImageData.width
  canvas.getContext('2d').putImageData(newImageData, 0, 0)

  return [leftEdge, rightEdge, topEdge, bottomEdge]
}

// const rectify(currentState: CellData[], incomingState: CellDiff[] ) {

// }

const getDiff = (
  starting: CellData[],
  updated: CellData[],
): { [key: string]: CellDiff } => {
  const diff: { [key: string]: CellDiff } = {}
  for (let key in updated) {
    if (starting[key] !== updated[key]) {
      diff[key] = {}
      for (let prop in updated[key]) {
        if ((updated[key] as any)[prop] !== (starting[key] as any)[prop]) {
          ;(diff[key] as any)[prop] = (updated[key] as any)[prop]
        }
      }
      if (diff[key] === {}) {
        delete diff[key]
      }
    }
  }
  return diff
}

export default (props: IndexPageProps, context: any) => {
  const [selectorIndex, setSelectorIndex] = useState(null)
  const [multiSelectorIndices, setMultiSelectorIndices] = useState<{
    [key: string]: number
  }>({})
  const [connections, setConnections] = useState<{
    [key: string]: Peer.DataConnection
  }>({})
  const [selectedIndices, setSelectedIndices] = useState([])
  const [multiSelectedIndices, setMultiSelectedIndices] = useState<{
    [key: string]: Array<number>
  }>({})

  const [pickingMe, setPickingMe] = useState(false)
  const [myColor, setMyColor] = useState('#ffcc00')

  const peer = useRef<Peer>(null)
  const [onlineId, setOnlineId] = useState('offline')
  const [hostId, setHostId] = useState('')
  const [clientIds, setClientIds] = useState<Array<string>>([])
  const [boardStateIndex, setBoardStateIndex] = useState(0)
  const boardStateIndexRef = useRef(0)
  const [editorText, setEditorText] = useState(
    RichTextEditor.createEmptyValue(),
  )
  boardStateIndexRef.current = boardStateIndex

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

  // console.log('CLIENT IDS', clientIds.length)
  let updateBoard = (update: (method: Array<CellData>) => void): void => {
    //useCallback(
    const out = produce(
      states.current[boardStateIndexRef.current],
      (cellsDraft: Array<CellData>) => {
        update(cellsDraft)
      },
    )
    console.log('INDEX: ', boardStateIndex)

    console.log('REF: ', boardStateIndexRef.current, states.current.length)
    // states.current.splice(
    //   boardStateIndexRef.current + 1,
    //   states.current.length,
    // )
    // console.log('STATZ', states.current)
    states.current.push(out)
    // console.log('CLIENTIDS', clientIds)
    if (clientIds.length !== 0) {
      for (let clientId in clientIds) {
        connections[clientIds[clientId]].send({
          type: 'state',
          state: out,
        })
      }
    } else if (Object.keys(connections).length !== 0) {
      const diff = getDiff(states.current[boardStateIndexRef.current], out)
      for (let key in connections) {
        connections[key].send({ type: 'update', diff: diff })
      }
    }
    setBoardStateIndex((boardStateIndex) => boardStateIndex + 1)
  } //,
  // [boardStateIndex, connections, clientIds, states.current],
  // )

  const hostProcessData = (conn: Peer.DataConnection, data: any) => {
    if (data && typeof data !== 'string' && 'type' in data) {
      if (data.type === 'pointer') {
        setMultiSelectorIndices((indices) => ({
          ...indices,
          [conn.peer]: data.index,
        }))
      } else if (data.type === 'selected') {
        setMultiSelectedIndices((indices) => ({
          ...indices,
          [conn.peer]: data.indices,
        }))
      } else if (data.type === 'update') {
        console.log(boardStateIndexRef.current, 'CURRENT THING')
        updateBoard((cells) => {
          for (let index in (data as {
            diff: {
              [key: string]: any
            }
          }).diff) {
            Object.assign(cells[parseInt(index)], data.diff[index])
          }
        })
        // states.current.push(states.current[boardStateIndexRef.current])
      }
    }
  }

  useEffect(() => {
    peer.current = new Peer()
    peer.current.on('open', (id) => {
      setOnlineId(id)
    })
  }, [])

  useEffect(() => {
    peer.current.on('connection', (conn) => {
      setConnections((connections) => ({
        ...connections,
        [conn.peer]: conn,
      }))
      conn.on('close', () => {
        console.log('CLOSING')
        setConnections((connections) => {
          let { [conn.peer]: toDel, ...out } = connections
          return out
        })
        setClientIds((ids) => ids.filter((id) => id !== conn.peer)) // Remove id from client id list
      })
      conn.on('open', () => {
        updateBoard(() => {}) //:P
        conn.on('data', (data) => {
          hostProcessData(conn, data)
        })
        setClientIds((clients) => [...clients, conn.peer])
        // conn.send({ type: 'pointer', index: index })
      })

      // conn.send({
      //   type: 'state',
      //   state: states.current[boardStateIndexRef.current],
      // })
    })
  }, [])

  const [image, setImage] = useState<{
    leftEdge: number
    rightEdge: number
    topEdge: number
    bottomEdge: number
    imageData: ImageData | null
  }>({ leftEdge: 0, rightEdge: 0, topEdge: 0, bottomEdge: 0, imageData: null })
  // const cells = localStorage.states[boardStateIndex]
  const cells = states.current[boardStateIndex]

  const select = (
    index: number,
    event: KeyboardEvent | React.MouseEvent<HTMLDivElement, MouseEvent>,
    multi = false,
  ) => {
    setSelectorIndex(index)
    for (let key in connections) {
      connections[key].send({ type: 'pointer', index: index })
    }
    if (event.ctrlKey) {
      if (selectedIndices.includes(index)) {
        setSelectedIndices((indices) => {
          const out = indices.filter((value) => value !== index)
          for (let key in connections) {
            connections[key].send({
              type: 'selected',
              indices: out,
            })
          }
          return out
        })
      }
    } else {
      if (event.shiftKey || multi) {
        if (
          typeof selectedIndices.find((value) => value === index) ===
          'undefined'
        ) {
          setSelectedIndices((indices) => {
            const out = indices.concat(index)
            for (let key in connections) {
              connections[key].send({
                type: 'selected',
                indices: out,
              })
            }
            return out
          })
        }
      } else {
        setSelectedIndices([index])
        for (let key in connections) {
          connections[key].send({
            type: 'selected',
            indices: [index],
          })
        }
      }
    }
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

      if (
        /[1-9]/.test(event.key) ||
        (/[!@#$%^&*(]/.test(event.key) && selectorIndex !== null)
      ) {
        if (event.altKey || event.ctrlKey) {
          //shit so annoying
          event.preventDefault()
        }
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
          let convertShift = ['!', '@', '#', '$', '%', '^', '&', '*', '(']
          let shiftedKey = convertShift.indexOf(event.key) + 1
          updateSelected((cell) => {
            if (!cell.center.includes(shiftedKey)) {
              cell.center.push(shiftedKey)
              cell.center.sort()
            } else {
              cell.center = cell.center.filter((value) => shiftedKey !== value)
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
            if (cell.number) {
              cell.number = null
            } else if (cell.corner.length !== 0 || cell.center.length !== 0) {
              cell.corner = []
              cell.center = []
            } else {
              cell.color = '#ffffff'
            }
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

  interface hostToClientData {
    type: string
    index?: number
    state?: CellData[]
    indices?: [number]
  }

  const initiateClient = () => {
    const conn = peer.current.connect(hostId)
    conn.on('open', () => {
      conn.send('hello')
      conn.on('data', (data: hostToClientData) => {
        if (data && typeof data !== 'string' && 'type' in data) {
          if (data.type === 'pointer') {
            setMultiSelectorIndices((indices) => ({
              ...indices,
              [conn.peer]: data.index,
            }))
          } else if (data.type === 'selected') {
            setMultiSelectedIndices((indices) => ({
              ...indices,
              [conn.peer]: data.indices,
            }))
          } else if (data.type === 'state') {
            updateBoard((cells) => {
              for (let i in cells) {
                Object.assign(cells[i], data.state[i])
              }
            })

            // updateBoard(state => rectify)
          }
        }

        // console.log('Received', data)
      })
    })
    setConnections((connections) => ({ ...connections, [hostId]: conn }))
  }

  return (
    <PageContainer>
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
                    myColor={myColor}
                    onMouseDown={(e) => {
                      // e.preventDefault()
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
                    boxGap={image.imageData ? '1px' : '2px'}
                    cellGap={image.imageData ? '0px' : '1px'}
                    key={index}
                    selected={
                      // Check if in the list
                      selectedIndices.includes(index)
                    }
                    multiSelected={
                      typeof Object.keys(multiSelectedIndices).find((i) =>
                        multiSelectedIndices[i].includes(index),
                      ) !== 'undefined'
                    }
                    selector={selectorIndex === index}
                    multiSelector={
                      typeof Object.keys(multiSelectorIndices).find(
                        (key) => multiSelectorIndices[key] === index,
                      ) !== 'undefined'
                    }
                    data={cell}
                    index={index}
                  />
                ),
              )}
            </SudokuGrid>
          )}
        </GridBackground>
      </GridContainer>
      <SidebarContainer>
        <Divider horizontal>Color</Divider>
        <CompactPicker
          color={
            pickingMe
              ? myColor
              : selectorIndex
              ? cells[selectorIndex].color
              : '#000000'
          }
          onChangeComplete={(color) => {
            // setColor(color.hex)
            if (pickingMe) {
              setMyColor(color.hex)
            } else {
              updateSelected((cell) => {
                cell.color = color.hex
              })
            }
          }}
        />
        <Button
          onClick={() => {
            setPickingMe((value) => !value)
          }}
          style={{ backgroundColor: myColor }}
        >
          {pickingMe ? 'Picking my color...' : 'Pick my color'}{' '}
        </Button>
        <Divider horizontal>File</Divider>
        <input type="file" id="upload-button" onChange={fileLoad} />
        <Divider horizontal>Multiplayer</Divider>
        {onlineId}
        <input
          // type="text"
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              initiateClient()
            }
          }}
          onChange={(event) => {
            setHostId(event.target.value)
          }}
          value={hostId}
        />
        {hostId}
        {clientIds.join(', ')}{' '}
        {connections !== {}
          ? clientIds.length !== 0
            ? 'HOST'
            : 'CLIENT'
          : 'NOT CONNECTED'}
        <Divider horizontal>Notes</Divider>
        <RichTextEditor value={editorText} onChange={setEditorText} />
      </SidebarContainer>
    </PageContainer>
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
