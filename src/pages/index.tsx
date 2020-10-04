import * as React from 'react'
// import Link from 'gatsby-link'
import { useState, useEffect, useRef, useCallback } from 'react'
import { graphql } from 'gatsby'
import { CompactPicker } from 'react-color'
import styled from '@emotion/styled'
import produce from 'immer'
import { Divider, Button, Accordion } from 'semantic-ui-react'
import RichTextEditor, { EditorValue } from 'react-rte'
import Peer from 'peerjs'
// import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import chroma from 'chroma-js'

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

const SudokuImageCanvas = styled.canvas<{
  image: {
    leftEdge: number
    rightEdge: number
    topEdge: number
    bottomEdge: number
    imageData: ImageData | null
  }
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

const PageContainer = styled.div`
  display: flex;
  width: 100%;
  height: 100vh;
  flex-direction: row;
`

const SidebarContainer = styled.div`
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
`

const GridCellBackground = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  z-index: 200;
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

interface CellData {
  number: number | null
  center: Array<number>
  corner: Array<number>
  color: string | null
}

interface CellDiff {
  number?: number | null
  center?: number[]
  corner?: number[]
  color?: string | null
}

interface GridCellProps {
  index: number
  imageLoaded: boolean
  data: CellData
  selectorColor: string | null
  selectedColor: string | null
  select: (
    index: number,
    event: KeyboardEvent | React.MouseEvent<HTMLDivElement, MouseEvent>,
    multi?: boolean,
  ) => void
  cellGap?: string
  boxGap?: string
}

const GridCell: React.FC<GridCellProps> = React.memo(
  ({
    index,
    imageLoaded,
    data,
    selectedColor,
    selectorColor,
    select,
    cellGap = '0px',
    boxGap = '1.5px',
  }) => {
    const column = index % 9
    const row = Math.floor(index / 9)

    return (
      <GridCellStyle
        onMouseDown={(e) => {
          // e.preventDefault()
          // e.stopPropagation()
          select(index, e)
        }}
        onMouseEnter={(e) => {
          // console.log()
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
            style={!data.number ? { fontSize: 12, fontWeight: 'bold' } : {}}
            className="noselect"
          >
            {data.number ? data.number : data.center.join('')}
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
            <HintNumberTop className="noselect">
              {data.corner.join('')}
            </HintNumberTop>
          )}
        </NumbersContainer>
      </GridCellStyle>
    )
  },
)

function getPixel(imgData: ImageData, index: number) {
  return imgData.data.slice(index * 4, index * 4 + 4)
}

const adjacentIndices = (
  index: number,
  x: number,
  y: number,
  width: number,
  height: number,
) => {
  let indices = []
  if (x > 0) {
    indices.push(index - 1)
  }
  if (x < width - 1) {
    indices.push(index + 1)
  }
  if (y > 0) {
    indices.push(index - width)
  }
  if (y < height - 1) {
    indices.push(index + width)
  }
  return indices
}

const preprocessImage = (imageData: ImageData) => {
  const canvas: HTMLCanvasElement = document.getElementById(
    'sudoku-image',
  ) as HTMLCanvasElement
  const annotationCanvas: HTMLCanvasElement = document.getElementById(
    'sudoku-annotations',
  ) as HTMLCanvasElement

  const rows = Array(imageData.height).fill(0)
  const columns = Array(imageData.width).fill(0)

  let newData: Uint8ClampedArray = new Uint8ClampedArray([...imageData.data])

  // Blacken semi-dark pixels adjacent to black ones
  // for (let index = 0; index < imageData.data.length / 4; ++index) {
  //   const x = index % imageData.width
  //   const y = Math.floor(index / imageData.width)
  //   const pixelData = getPixel(imageData, index)
  //   const [hue, saturation, value] = chroma([...pixelData.slice(0, 3)]).hsv()
  //   if (value < 0.2) {
  //     //is black
  //     columns[x] = ++columns[x]
  //     rows[y] = ++rows[y]
  //   }
  //   if (value > 0.8 || (saturation > 0.5 && Math.abs(value - 0.5) < 0.3)) {
  //     annotationData[index * 4 + 3] = 0
  //   }
  // }

  let annotationData: Uint8ClampedArray = new Uint8ClampedArray([...newData])

  for (let index = 0; index < imageData.data.length / 4; ++index) {
    const x = index % imageData.width
    const y = Math.floor(index / imageData.width)
    const pixelData = getPixel(imageData, index)
    const [hue, chromaValue, lightness] = chroma([
      ...pixelData.slice(0, 3),
    ]).hcl()
    // const intensity = (pixelData[0] + pixelData[1] + pixelData[2]) / 3
    if (lightness < 20) {
      //is black
      columns[x] = ++columns[x]
      rows[y] = ++rows[y]
    }
    if (lightness > 50 && (lightness > 95 || chromaValue > 10)) {
      annotationData[index * 4 + 3] = 0
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

  for (let index = 0; index < imageData.data.length / 4; ++index) {
    const x = index % imageData.width
    const y = Math.floor(index / imageData.width)
    const pixelData = getPixel(imageData, index)
    const [hue, chromaValue, lightness] = chroma([
      ...pixelData.slice(0, 3),
    ]).hcl()
    // const intensity = (pixelData[0] + pixelData[1] + pixelData[2]) / 3
    if (
      (x > rightEdge || x < leftEdge || y < topEdge || y > bottomEdge) &&
      lightness > 95
    ) {
      newData[index * 4 + 3] = 0
    }
  }

  const newImageData = new ImageData(
    new Uint8ClampedArray(newData),
    imageData.width,
  )

  const newAnnotationData = new ImageData(
    new Uint8ClampedArray(annotationData),
    imageData.width,
  )

  canvas.height = newImageData.height
  canvas.width = newImageData.width
  annotationCanvas.height = newAnnotationData.height
  annotationCanvas.width = newAnnotationData.width
  canvas.getContext('2d').putImageData(newImageData, 0, 0)
  annotationCanvas.getContext('2d').putImageData(newAnnotationData, 0, 0)

  return [leftEdge, rightEdge, topEdge, bottomEdge]
}

// const rectify(currentState: CellData[], incomingState: CellDiff[] ) {

// }

// get a differential tree btwn two states
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

type HostToClientData =
  | {
      type: 'state'
      state: CellData[]
    }
  | {
      type: 'pointer'
      index: number
    }
  | {
      type: 'selected'
      indices: number[]
    }
  | {
      type: 'image'
      file: Blob
      filetype: string
    }

type ClientToHostData =
  | {
      type: 'pointer'
      index: number
    }
  | {
      type: 'selected'
      indices: number[]
    }
  | {
      type: 'update'
      diff: { [key: string]: CellDiff }
    }

// type: string
// index?: number
// state?: CellData[]
// indices?: [number]

interface PageState {
  selectorIndex: number
  multiSelectorIndices: { [key: string]: number }
  selectedIndices: number[]
  multiSelectedIndices: { [key: string]: number[] }
  multiColors: { [key: string]: string }
  connections: { [key: string]: Peer.DataConnection }
  pickingMe: boolean
  myColor: string
  selectorColor: string
  editorText: EditorValue
  boardStateIndex: number
  onlineId: string
  hostId: string
  clientIds: string[]
  image: {
    leftEdge: number
    rightEdge: number
    topEdge: number
    bottomEdge: number
    imageData: ImageData | null
  }
  // layers:
}

class Page extends React.Component<{}, PageState> {
  state: PageState = {
    selectorIndex: null,
    multiSelectorIndices: {},
    selectedIndices: [],
    multiSelectedIndices: {},
    multiColors: {},
    connections: {},
    pickingMe: false,
    myColor: '#ffcc00',
    selectorColor: '#ffffff',
    boardStateIndex: 0,
    editorText: RichTextEditor.createEmptyValue(),
    onlineId: 'offline',
    hostId: '',
    clientIds: [],
    image: {
      leftEdge: 0,
      rightEdge: 0,
      topEdge: 0,
      bottomEdge: 0,
      imageData: null,
    },
  }

  peer: Peer | null = null
  currentHost: string | null = null

  // const [layers, setLayers] = useState([1, 2])

  boardStates: CellData[][] = [
    Array(81)
      .fill(1)
      .map((value) => ({
        number: null,
        center: [],
        corner: [],
        color: null,
      })),
  ]

  currentFile: Blob | null = null
  currentFileType: string | null = null

  // console.log('CLIENT IDS', clientIds.length)
  updateBoard = (update: (method: CellData[]) => void): void => {
    const { boardStateIndex, clientIds, connections } = this.state
    //useCallback(
    const out = produce(
      this.boardStates[boardStateIndex],
      (cellsDraft: Array<CellData>) => {
        update(cellsDraft)
      },
    )

    this.boardStates.splice(boardStateIndex + 1, this.boardStates.length)
    this.boardStates.push(out)
    if (clientIds.length !== 0) {
      for (let clientId in clientIds) {
        connections[clientIds[clientId]].send({
          type: 'state',
          state: out,
        })
      }
    } else if (Object.keys(connections).length !== 0) {
      const diff = getDiff(this.boardStates[boardStateIndex], out)
      console.log('DIFF: ', diff)
      if (diff !== {}) {
        for (let key in connections) {
          connections[key].send({ type: 'update', diff: diff })
        }
      }
    }
    this.setState((state) => ({ boardStateIndex: state.boardStateIndex + 1 }))
  }

  // Process data from clients
  hostProcessData = (conn: Peer.DataConnection, data: ClientToHostData) => {
    const { boardStateIndex } = this.state
    if (data && typeof data !== 'string' && 'type' in data) {
      if (data.type === 'pointer') {
        this.setState((state) => ({
          multiSelectorIndices: {
            ...state.multiSelectorIndices,
            [conn.peer]: data.index,
          },
        }))
      } else if (data.type === 'selected') {
        this.setState((state) => ({
          multiSelectedIndices: {
            ...state.multiSelectedIndices,
            [conn.peer]: data.indices,
          },
        }))
      } else if (data.type === 'update') {
        this.updateBoard((cells: Array<CellData>) => {
          for (let index in data.diff) {
            Object.assign(cells[parseInt(index)], data.diff[index])
          }
        })
      }
    }
  }

  // HOST connection setup
  connectionCallback = (conn: Peer.DataConnection) => {
    this.setState((state) => ({
      connections: {
        ...state.connections,
        [conn.peer]: conn,
      },
    }))
    conn.on('close', () => {
      console.log('CLOSING')
      this.setState((state) => {
        let { [conn.peer]: toDel, ...out } = state.connections
        return {
          connections: out,
          clientIds: state.clientIds.filter((id) => id !== conn.peer),
        }
      })
    })
    //When we have a client joining our hosted session
    conn.on('open', () => {
      conn.send({
        type: 'state',
        state: this.boardStates[this.state.boardStateIndex],
      })
      if (this.state.selectorIndex) {
        conn.send({
          type: 'pointer',
          index: this.state.selectorIndex,
        })
      }
      conn.send({
        type: 'selected',
        indices: this.state.selectedIndices,
      })
      if (this.currentFile) {
        conn.send({
          type: 'image',
          file: this.currentFile,
          filetype: this.currentFileType,
        })
      }
      conn.on('data', (data) => {
        this.hostProcessData(conn, data)
      })
      this.setState((state) => ({ clientIds: [...state.clientIds, conn.peer] }))
      // conn.send({ type: 'pointer', index: index })
    })
  }

  select = (
    index: number,
    event: KeyboardEvent | React.MouseEvent<HTMLDivElement, MouseEvent>,
    multi = false,
  ) => {
    const { connections, selectedIndices, image } = this.state
    if (!event.altKey) {
      this.setState({ selectorIndex: index })
      for (let key in connections) {
        connections[key].send({ type: 'pointer', index: index })
      }
    }
    if (event.ctrlKey) {
      if (selectedIndices.includes(index)) {
        this.setState((state) => {
          const out = state.selectedIndices.filter((value) => value !== index)
          for (let key in connections) {
            connections[key].send({
              type: 'selected',
              indices: out,
            })
          }
          return { selectedIndices: out }
        })
      }
    } else if (event.shiftKey || multi) {
      if (
        typeof selectedIndices.find((value) => value === index) === 'undefined'
      ) {
        this.setState((state) => {
          const out = state.selectedIndices.concat(index)
          for (let key in connections) {
            connections[key].send({
              type: 'selected',
              indices: out,
            })
          }
          return { selectedIndices: out }
        })
      }
    } else if (event.altKey) {
      // console.log
      if (!image.imageData) {
        return
      }
      if ('clientX' in event) {
        const canvas = document.getElementById(
          'sudoku-image',
        ) as HTMLCanvasElement
        const rect = canvas.getBoundingClientRect()
        const x = Math.round(
          ((event.clientX - rect.x) * image.imageData.width) /
            (rect.right - rect.left),
        )
        const y = Math.round(
          ((event.clientY - rect.y) * image.imageData.height) /
            (rect.bottom - rect.top),
        )

        if (canvas.getContext('2d').getImageData(x, y, 1, 1).data[3] === 255) {
          const color = chroma([
            ...canvas
              .getContext('2d')
              .getImageData(x, y, 1, 1)
              .data.slice(0, 3),
          ])
          console.log('HSV:', color.hsv(), 'HCL:', color.hcl())
          this.setState({ selectorColor: color.hex() })
          this.updateSelected((cell) => {
            cell.color = color.hex()
          })
        }
      }
    } else {
      this.setState({ selectedIndices: [index] })
      for (let key in connections) {
        connections[key].send({
          type: 'selected',
          indices: [index],
        })
      }
    }
  }

  updateSelected = (update: (cell: CellData) => void): void => {
    const { selectedIndices } = this.state
    this.updateBoard((cells: any) => {
      for (let selected in selectedIndices) {
        update(cells[selectedIndices[selected]])
      }
    })
  }

  keyCallback = (event: KeyboardEvent) => {
    const { selectorIndex, boardStateIndex, connections } = this.state
    if (selectorIndex === null) {
      return
    }
    // Use regex to test if digit btwn 1-9
    if (/[1-9]/.test(event.key) || /[!@#$%^&*(]/.test(event.key)) {
      if (event.altKey || event.ctrlKey) {
        //shit so annoying
        event.preventDefault()
      }

      if (event.altKey) {
        this.updateSelected((cell) => {
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
        this.updateSelected((cell) => {
          if (!cell.center.includes(shiftedKey)) {
            cell.center.push(shiftedKey)
            cell.center.sort()
          } else {
            cell.center = cell.center.filter((value) => shiftedKey !== value)
            cell.center.sort()
          }
        })
      } else {
        this.updateSelected((cell) => {
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
        if (
          !this.currentHost &&
          event.ctrlKey &&
          boardStateIndex < this.boardStates.length - 1
        ) {
          this.setState({
            boardStateIndex: boardStateIndex + 1,
          })
          for (let clientId in this.state.clientIds) {
            connections[this.state.clientIds[clientId]].send({
              type: 'state',
              state: this.boardStates[boardStateIndex + 1],
            })
          }
        }
        break
      case 'z':
        if (!this.currentHost && event.ctrlKey && boardStateIndex > 0) {
          this.setState((state) => ({
            boardStateIndex: state.boardStateIndex - 1,
          }))
          for (let clientId in this.state.clientIds) {
            connections[this.state.clientIds[clientId]].send({
              type: 'state',
              state: this.boardStates[boardStateIndex - 1],
            })
          }
        }
        break
      case 'a':
        if (event.ctrlKey) {
          event.preventDefault()
          // equiv to [0..80]
          const allIndices = Array(81)
            .fill(0)
            .map((v, index) => index)
          this.setState({
            selectedIndices: allIndices,
          })
          for (let key in connections) {
            connections[key].send({
              type: 'selected',
              indices: allIndices,
            })
          }
        }
        break
      case 'ArrowLeft':
        if (selectorIndex % 9 > 0) {
          this.select(selectorIndex - 1, event)
        }
        break
      case 'ArrowRight':
        if (selectorIndex % 9 < 8) {
          this.select(selectorIndex + 1, event)
        }
        break
      case 'ArrowUp':
        if (selectorIndex > 8) {
          this.select(selectorIndex - 9, event)
        }
        break
      case 'ArrowDown':
        if (selectorIndex < 72) {
          this.select(selectorIndex + 9, event)
        }
        break
      case 'Delete':
        this.updateSelected((cell) => {
          if (cell.number) {
            cell.number = null
          } else if (cell.corner.length !== 0 || cell.center.length !== 0) {
            cell.corner = []
            cell.center = []
          } else {
            cell.color = null
          }
        })
        break
    }
  }

  fileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { connections } = this.state
    if (event.target.files.length) {
      const file = event.target.files[0]
      const blob = new Blob([file], { type: file.type })
      this.currentFile = blob
      this.currentFileType = file.type
      for (let key in connections) {
        connections[key].send({
          type: 'image',
          file: blob,
          // name: file.name,
          filetype: file.type,
        })
      }
      this.imageLoad(blob)
    }
  }

  imageLoad = (file: Blob) => {
    const canvas = document.getElementById('sudoku-image') as HTMLCanvasElement

    const image = new Image()
    const url = URL.createObjectURL(file)
    image.src = url

    image.onload = () => {
      URL.revokeObjectURL(url)
      const context = canvas.getContext('2d')
      canvas.width = image.width
      canvas.height = image.height
      context.drawImage(image, 0, 0)
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
      const [leftEdge, rightEdge, topEdge, bottomEdge] = preprocessImage(
        imageData,
      )
      this.setState({
        image: { leftEdge, rightEdge, topEdge, bottomEdge, imageData },
      })
    }
  }

  // CLIENT connection setup
  initiateClient = () => {
    this.currentHost = this.state.hostId
    const conn = this.peer.connect(this.currentHost)
    //When we join a remote server
    conn.on('open', () => {
      // conn.send({type: "pointerColor", color: this.state.myColor})
      conn.on('data', (data: HostToClientData) => {
        if (data && typeof data !== 'string' && 'type' in data) {
          if (data.type === 'pointer') {
            this.setState((state) => ({
              multiSelectorIndices: {
                ...state.multiSelectorIndices,
                [conn.peer]: data.index,
              },
            }))
          } else if (data.type === 'selected') {
            this.setState((state) => ({
              multiSelectedIndices: {
                ...state.multiSelectedIndices,
                [conn.peer]: data.indices,
              },
            }))
          } else if (data.type === 'state') {
            this.boardStates.push(data.state)
            this.setState((state) => ({
              boardStateIndex: state.boardStateIndex + 1,
            }))
          } else if (data.type === 'image') {
            const blob = new Blob([data.file], { type: data.filetype })
            this.currentFile = blob
            this.imageLoad(blob)
          }
        }
      })
    })
    this.setState((state) => ({
      connections: {
        ...state.connections,
        [this.currentHost]: conn,
      },
    }))
  }

  pageClicked = () => {
    const { connections } = this.state
    // console.log('deselect')
    this.setState({ selectorIndex: null })
    for (let key in connections) {
      connections[key].send({ type: 'pointer', index: null })
    }
  }

  componentDidMount = () => {
    const id = localStorage.getItem('id')
    this.peer = id ? new Peer(id) : new Peer()
    this.peer.on('open', (id) => {
      localStorage.id = id
      this.setState({ onlineId: id })
    })
    this.peer.on('connection', this.connectionCallback)
    window.addEventListener('keydown', this.keyCallback)
    window.addEventListener('mousedown', this.pageClicked)
  }

  componentWillUnmount = () => {
    this.peer.off('connection', this.connectionCallback)
    window.removeEventListener('keydown', this.keyCallback)
    window.removeEventListener('mousedown', this.pageClicked)
  }

  setEditorText = (text: EditorValue) => {
    this.setState({ editorText: text })
  }

  Sidebar = React.memo(
    ({
      pickingMe,
      myColor,
      selectorColor,
      onlineId,
      hostId,
      clientIds,
      connections,
      editorText,
    }: {
      pickingMe: boolean
      myColor: string
      selectorColor: string
      onlineId: string
      hostId: string
      clientIds: string[]
      connections: { [key: string]: Peer.DataConnection }
      editorText: EditorValue
    }) => (
      <SidebarContainer>
        <Divider horizontal>Color</Divider>
        <CompactPicker
          colors={[
            '#FFFFFF',
            '#f3c693',
            '#ff7575',
            '#FE9200',
            '#FCDC00',
            '#f3fb7f',
            '#DBDF00',
            '#8cd2b1',
            '#80EFFF',
            '#2EEFFF',
            '#AEA1FF',
            '#FDA1FF',
            //
            '#B3B3B3',
            '#ffbeb1',
            '#FF492A',
            '#E27300',
            '#FCC400',
            '#B0BC00',
            '#A4DD00',
            '#00FB83',
            '#68CCCA',
            '#6AC7FF',
            '#D579FF',
            '#FA28FF',
            //
            '#000000',
            '#ef9173',
            '#ff0000',
            '#ff4d00',
            '#FB9E00',
            '#68BC00',
            '#00fb1d',
            '#30C18A',
            '#16A5A5',
            '#009CE0',
            '#7B64FF',
            '#AB149E',
          ]}
          color={pickingMe ? myColor : selectorColor}
          onChangeComplete={(color) => {
            // setColor(color.hex)
            if (pickingMe) {
              this.setState({ myColor: color.hex })
            } else {
              this.setState({ selectorColor: color.hex })
              this.updateSelected((cell) => {
                cell.color = color.hex
              })
            }
          }}
        />
        <Button
          onClick={(event) => {
            this.setState((state) => ({ pickingMe: !state.pickingMe }))
          }}
          style={{ backgroundColor: myColor }}
        >
          {pickingMe ? 'Picking my color...' : 'Pick my color'}{' '}
        </Button>
        <Divider horizontal>File</Divider>
        <input type="file" id="upload-button" onChange={this.fileInput} />
        <Divider horizontal>Multiplayer</Divider>
        ID: {onlineId} <br />
        <span>
          <input
            // type="text"
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                this.initiateClient()
              }
            }}
            onChange={(event) => {
              this.setState({ hostId: event.target.value })
            }}
            value={hostId}
          />
          <span style={{ float: 'right' }}>
            {Object.keys(connections).length !== 0
              ? clientIds.length !== 0
                ? 'HOST'
                : 'CLIENT'
              : 'NOT CONNECTED'}
          </span>
        </span>
        <br />
        {this.currentHost && 'Host is: ' + this.currentHost}
        {clientIds.length !== 0 && 'Clients are: ' + clientIds.join(', ')}
        <Divider horizontal>Notes</Divider>
        <RichTextEditor value={editorText} onChange={this.setEditorText} />
        <Accordion>
          {/* <DragDropContext onDragEnd={() => {}}>
    <Draggable>
      <Droppable>
        <>hi</>
      </Droppable>
      <Droppable>
        <>hello</>
      </Droppable>
    </Draggable>
  </DragDropContext> */}
        </Accordion>
      </SidebarContainer>
    ),
  )

  render = () => {
    // I just like this pattern, idk. typing "this.state.<prop>" gets annoying
    const {
      image,
      boardStateIndex,
      myColor,
      pickingMe,
      onlineId,
      selectedIndices,
      selectorIndex,
      selectorColor,
      multiSelectedIndices,
      multiSelectorIndices,
      hostId,
      clientIds,
      connections,
      editorText,
    } = this.state
    return (
      <PageContainer>
        <GridContainer>
          <GridBackground
            style={image.imageData ? { backgroundColor: '#ffffff' } : {}}
            onMouseDown={(e) => {
              //Stop click event from propagating to window, used for deselect checking
              e.stopPropagation()
            }}
          >
            {/* <SudokuImafno */}
            <SudokuImageCanvas
              style={{ zIndex: 300 }}
              image={image}
              id="sudoku-annotations"
            />
            <SudokuImageCanvas
              style={{ zIndex: 200 }}
              image={image}
              id="sudoku-image"
            />
            {this.boardStates[boardStateIndex] && (
              <SudokuGrid style={{ padding: image.imageData ? '1px' : '2px' }}>
                {(this.boardStates[boardStateIndex] as Array<CellData>).map(
                  (cell, index) => (
                    <GridCell
                      select={this.select}
                      boxGap={image.imageData ? '1px' : '2px'}
                      cellGap={image.imageData ? '0px' : '1px'}
                      key={index}
                      selectedColor={
                        // Check if in the list
                        selectedIndices.includes(index)
                          ? myColor
                          : typeof Object.keys(multiSelectedIndices).find((i) =>
                              multiSelectedIndices[i].includes(index),
                            ) !== 'undefined'
                          ? '#3388ff'
                          : null
                      }
                      selectorColor={
                        selectorIndex === index
                          ? myColor
                          : typeof Object.keys(multiSelectorIndices).find(
                              (key) => multiSelectorIndices[key] === index,
                            ) !== 'undefined'
                          ? '#3388ff'
                          : null
                      }
                      data={cell}
                      index={index}
                      imageLoaded={!!image.imageData}
                    />
                  ),
                )}
              </SudokuGrid>
            )}
          </GridBackground>
        </GridContainer>
        <this.Sidebar
          pickingMe={pickingMe}
          myColor={myColor}
          selectorColor={selectorColor}
          onlineId={onlineId}
          hostId={hostId}
          clientIds={clientIds}
          connections={connections}
          editorText={editorText}
        />
      </PageContainer>
    )
  }
}

export default Page

export const pageQuery = graphql`
  query IndexQuery {
    site {
      siteMetadata {
        title
      }
    }
  }
`
