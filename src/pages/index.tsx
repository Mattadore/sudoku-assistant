import * as React from 'react'
// import Link from 'gatsby-link'
import { useState, useEffect, useRef, useCallback } from 'react'
import { graphql } from 'gatsby'
import { CompactPicker } from 'react-color'
import styled from '@emotion/styled'
import produce from 'immer'
import { Divider, Button } from 'semantic-ui-react'
import RichTextEditor, { EditorValue } from 'react-rte'
import Peer from 'peerjs'
import {
  List,
  Drawer,
  ListItem,
  TextareaAutosize,
  Accordion,
  Typography,
  AccordionSummary,
  AccordionDetails,
  AppBar,
  Toolbar,
  IconButton,
} from '@material-ui/core'
// import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import chroma from 'chroma-js'
import GridCell from 'components/GridCell'
import Helmet from 'react-helmet'
import { ExpandMore, Menu as MenuIcon } from '@material-ui/icons'

import {
  Theme,
  makeStyles,
  createStyles,
  withStyles,
} from '@material-ui/core/styles'
import { TextField } from '@material-ui/core'

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      flexGrow: 1,
    },
    menuButton: {
      marginRight: theme.spacing(2),
    },
    title: {
      flexGrow: 1,
    },
  }),
)

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
  const rows = Array(imageData.height).fill(0)
  const columns = Array(imageData.width).fill(0)

  let newData: Uint8ClampedArray = new Uint8ClampedArray([...imageData.data])
  let annotationData: Uint8ClampedArray = new Uint8ClampedArray([
    ...imageData.data,
  ])

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

  // annotation is just the background image
  const newAnnotationData = new ImageData(
    new Uint8ClampedArray(annotationData),
    imageData.width,
  )

  return {
    leftEdge,
    rightEdge,
    topEdge,
    bottomEdge,
    newImageData,
    newAnnotationData,
  }
}

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

interface Userdata {
  selectorIndex: number | null
  selectedIndices: number[]
  color: string
}

type HostToClientData = Partial<{
  state: CellData[]
  image: Blob
  imagetype: string
  userdataDiffMap: { [id: string]: Partial<Userdata> }
}>

type ClientToHostData = Partial<{
  update: { [key: string]: CellDiff }
  userdataDiff: Partial<Userdata>
}>

// type: string
// index?: number
// state?: CellData[]
// indices?: [number]

interface PageState {
  multiUserdata: { [key: string]: Userdata }
  selectorIndex: number | null
  // multiSelectorIndices: { [key: string]: number | null }
  selectedIndices: number[]
  // multiSelectedIndices: { [key: string]: number[] }
  // multiColors: { [key: string]: string }
  clients: { [key: string]: Peer.DataConnection }
  host: Peer.DataConnection | null
  conflicts: boolean[]
  pickingMe: boolean
  color: string
  selectorColor: string
  editorText: EditorValue
  boardStateIndex: number
  onlineId: string
  hostInputValue: string
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
    multiUserdata: {},
    selectorIndex: null,
    // multiSelectorIndices: {},
    selectedIndices: [],
    // multiSelectedIndices: {},
    // multiColors: {},
    clients: {},
    host: null,
    conflicts: [],
    pickingMe: false,
    color:
      typeof localStorage.color === 'string' ? localStorage.color : '#ffcc00',
    selectorColor: '#ffffff',
    boardStateIndex: 0,
    editorText: RichTextEditor.createEmptyValue(),
    onlineId: 'offline',
    hostInputValue: '',
    image: {
      leftEdge: 0,
      rightEdge: 0,
      topEdge: 0,
      bottomEdge: 0,
      imageData: null,
    },
  }

  // mergeDataIntoState = () =>

  peer: Peer | null = null
  // currentHost: string | null = null

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

  // Invoked when changing anyone else's data
  updateMultiuserdata = (update: { [id: string]: Partial<Userdata> }) => {
    this.setState((state) => {
      // TODO: blacklist the host from changing state keys they should not have access to
      const mergedMultidata = { ...state.multiUserdata }
      for (let id of Object.keys(update)) {
        mergedMultidata[id] = {
          ...(state.multiUserdata[id] ?? {}),
          ...update[id],
        }
      }
      return { multiUserdata: mergedMultidata }
    })
    const { clients } = this.state
    if (Object.values(clients).length > 0) {
      for (let client of Object.values(clients)) {
        const { color, selectorIndex, selectedIndices } = this.state
        client.send({
          userdataDiffMap: {
            ...this.state.multiUserdata,
            [this.state.onlineId]: {
              color,
              selectorIndex,
              selectedIndices,
            } as Partial<Userdata>,
          },
        } as HostToClientData)
      }
    }
  }

  // Invoked when changing your OWN user data
  updateUserdata = (update: Partial<Userdata>) => {
    this.setState((state) => ({ ...state, ...update }))
    const { host, clients } = this.state
    if (host) {
      host.send({ userdataDiff: update } as ClientToHostData)
    } else if (Object.values(clients).length > 0) {
      for (let client of Object.values(clients)) {
        client.send({
          userdataDiffMap: { [this.state.onlineId]: update },
        } as HostToClientData)
      }
    }
  }

  updateBoard = (update: (method: CellData[]) => void): void => {
    const { boardStateIndex, clients } = this.state
    //useCallback(
    const out = produce(
      this.boardStates[boardStateIndex],
      (cellsDraft: Array<CellData>) => {
        update(cellsDraft)
      },
    )

    this.boardStates.splice(boardStateIndex + 1, this.boardStates.length)
    this.boardStates.push(out)
    if (Object.keys(clients).length !== 0) {
      for (let client of Object.values(clients)) {
        client.send({
          state: out,
        } as HostToClientData)
      }
    } else if (this.state.host) {
      const diff = getDiff(this.boardStates[boardStateIndex], out)
      if (diff !== {}) {
        this.state.host.send({ update: diff } as ClientToHostData)
      }
    }

    this.setState((state) => ({ boardStateIndex: state.boardStateIndex + 1 }))
  }

  hostProcessRequest = (
    request: ClientToHostData,
    conn: Peer.DataConnection,
  ) => {
    if (request.userdataDiff) {
      this.updateMultiuserdata({ [conn.peer]: request.userdataDiff })
    }
    if (request.update) {
      this.updateBoard((cells: Array<CellData>) => {
        for (let index in request.update) {
          Object.assign(cells[parseInt(index)], request.update[index])
        }
      })
    }
  }

  // Process data from clients
  hostProcessData = (conn: Peer.DataConnection, data: ClientToHostData) => {
    const reply: HostToClientData = {}
    const { boardStateIndex, clients, onlineId } = this.state
    this.hostProcessRequest(data, conn)
  }

  // HOST connection setup
  connectionCallback = (conn: Peer.DataConnection) => {
    conn.on('close', () => {
      this.setState((state) => {
        let { [conn.peer]: toDel, ...clientsOut } = state.clients
        let { [conn.peer]: toDelUserdata, ...userdataOut } = state.multiUserdata
        return {
          clients: clientsOut,
          multiUserdata: userdataOut,
        }
      })
    })
    //When we have a client joining our hosted session
    conn.on('open', () => {
      const message: HostToClientData = {
        state: this.boardStates[this.state.boardStateIndex],
        userdataDiffMap: {
          ...this.state.multiUserdata,
          [this.state.onlineId]: {
            color: this.state.color,
            selectedIndices: this.state.selectedIndices,
            selectorIndex: this.state.selectorIndex,
          },
        },
      }
      if (this.currentFile && this.currentFileType) {
        message.image = this.currentFile
        message.imagetype = this.currentFileType
      }
      conn.send(message)
      conn.on('data', (data) => {
        this.hostProcessData(conn, data)
      })
      this.setState((state) => ({
        clients: {
          ...state.clients,
          [conn.peer]: conn,
        },
      })) // conn.send({ type: 'pointer', index: index })
    })
  }

  select = (
    index: number,
    event: KeyboardEvent | React.MouseEvent<HTMLDivElement, MouseEvent>,
    multi = false,
  ) => {
    const { clients, selectedIndices, image, host } = this.state
    if (!event.altKey) {
      this.updateUserdata({ selectorIndex: index })
    }
    if (event.ctrlKey) {
      if (selectedIndices.includes(index)) {
        // this.setState((state) => {
        const out = this.state.selectedIndices.filter(
          (value) => value !== index,
        )
        this.updateUserdata({ selectedIndices: out })
        return { selectedIndices: out }
      }
    } else if (event.shiftKey || multi) {
      if (
        typeof selectedIndices.find((value) => value === index) === 'undefined'
      ) {
        const out = this.state.selectedIndices.concat(index)
        this.updateUserdata({ selectedIndices: out })
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

        if (canvas.getContext('2d')?.getImageData(x, y, 1, 1).data[3] === 255) {
          const color = chroma([
            ...canvas
              .getContext('2d')!
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
      this.updateUserdata({ selectedIndices: [index] })
    }
  }

  validate: (data: CellData[]) => boolean[] = (data) => {
    let conflicts: boolean[] = Array(81).fill(false)
    let arraySolution = []
    const cellNumbers = data.map((cell) => cell.number)
    for (let index = 0; index < 9; index++) {
      arraySolution.push(cellNumbers.slice(index * 9, index * 9 + 9))
    }

    for (let y = 0; y < 9; y++) {
      for (let x = 0; x < 9; x++) {
        let value = arraySolution[y][x]
        if (value) {
          // Validate row
          for (let x2 = x + 1; x2 < 9; x2++) {
            if (arraySolution[y][x2] == value) {
              conflicts[9 * y + x2] = true
              conflicts[9 * y + x] = true
            }
          }

          // Validate column
          for (let y2 = y + 1; y2 < 9; y2++) {
            if (arraySolution[y2][x] == value) {
              conflicts[9 * y2 + x] = true
              conflicts[9 * y + x] = true
            }
          }

          // Validate square
          let startY = Math.floor(y / 3) * 3
          for (let y2 = startY; y2 < startY + 3; y2++) {
            let startX = Math.floor(x / 3) * 3
            for (let x2 = startX; x2 < startX + 3; x2++) {
              if ((x2 != x || y2 != y) && arraySolution[y2][x2] == value) {
                conflicts[9 * y2 + x2] = true
              }
            }
          }
        }
      }
    }
    return conflicts
  }

  componentDidUpdate = (prevProps: any, prevState: PageState) => {
    if (prevState.boardStateIndex !== this.state.boardStateIndex) {
      const conflicts = this.validate(
        this.boardStates[this.state.boardStateIndex],
      )

      this.setState((state) => ({ conflicts }))
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
    const { selectorIndex, boardStateIndex, clients, host } = this.state
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
          !host &&
          event.ctrlKey &&
          boardStateIndex < this.boardStates.length - 1
        ) {
          this.setState({
            boardStateIndex: boardStateIndex + 1,
          })
          for (let client of Object.values(clients)) {
            client.send({
              type: 'state',
              state: this.boardStates[boardStateIndex + 1],
            } as HostToClientData)
          }
        }
        break
      case 'z':
        if (!host && event.ctrlKey && boardStateIndex > 0) {
          this.setState((state) => ({
            boardStateIndex: state.boardStateIndex - 1,
          }))
          for (let client of Object.values(clients)) {
            client.send({
              state: this.boardStates[boardStateIndex - 1],
            } as HostToClientData)
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
          // this.setState({
          //   selectedIndices: allIndices,
          // })
          // for (let key in connections) {
          //   connections[key].send([
          //     {
          //       type: 'selected',
          //       indices: allIndices,
          //     },
          //   ])
          // }
          this.updateUserdata({ selectedIndices: allIndices })
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
    const { host, clients } = this.state
    if (event.target.files?.length) {
      const file = event.target.files[0]
      const blob = new Blob([file], { type: file.type })
      this.currentFile = blob
      this.currentFileType = file.type
      for (let conn of host ? [host] : Object.values(clients)) {
        conn.send({
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
    const annotationCanvas = document.getElementById(
      'sudoku-annotations',
    ) as HTMLCanvasElement

    const image = new Image()
    const url = URL.createObjectURL(file)
    image.src = url

    image.onload = () => {
      URL.revokeObjectURL(url)
      const context = canvas.getContext('2d')
      const annotationContext = annotationCanvas.getContext('2d')
      if (!(context && annotationContext)) {
        console.error('Canvas failed to load?')
        return
      }
      canvas.width = image.width
      canvas.height = image.height
      context.drawImage(image, 0, 0)
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
      const preprocessed = preprocessImage(imageData)
      if (!preprocessed) {
        console.error('Image loading failed')
        return
      }

      const {
        leftEdge,
        rightEdge,
        topEdge,
        bottomEdge,
        newImageData,
        newAnnotationData,
      } = preprocessed

      canvas.height = newImageData.height
      canvas.width = newImageData.width
      annotationCanvas.height = newAnnotationData.height
      annotationCanvas.width = newAnnotationData.width
      context.putImageData(newImageData, 0, 0)
      annotationContext.putImageData(newAnnotationData, 0, 0)
      this.setState({
        image: { leftEdge, rightEdge, topEdge, bottomEdge, imageData },
      })
    }
  }

  // CLIENT connection setup
  initiateClient = () => {
    const currentHost = this.state.hostInputValue
    // this.setState({ host: currentHost })
    if (!this.peer) {
      console.error('Cannot initiate client connection, peerjs setting up')
      return
    }
    const conn = this.peer.connect(currentHost)
    //When we join a remote server
    conn.on('open', () => {
      // conn.send({type: "pointerColor", color: this.state.myColor})
      conn.send({
        userdataDiff: {
          color: this.state.color,
          selectedIndices: this.state.selectedIndices,
          selectorIndex: this.state.selectorIndex,
        },
      } as ClientToHostData)

      conn.on('data', (data: HostToClientData) => {
        if (data && typeof data !== 'string') {
          // TODO: screw client out of their own state list?
          if (data.state) {
            this.boardStates.push(data.state)
            this.setState((state) => ({
              boardStateIndex: state.boardStateIndex + 1,
            }))
          }
          if (data.image && data.imagetype) {
            const blob = new Blob([data.image], { type: data.imagetype })
            this.currentFile = blob
            this.imageLoad(blob)
          }
          if (data.userdataDiffMap) {
            this.updateMultiuserdata(data.userdataDiffMap)
          }
        }
      })
    })
    this.setState({
      host: conn,
    })
  }

  pageClicked = () => {
    // console.log('deselect')
    this.updateUserdata({ selectorIndex: null })
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
    this.peer?.off('connection', this.connectionCallback)
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
      hostInputValue,
      // clientIds,
      // connections,
      host,
      clients,
    }: // editorText,
    {
      pickingMe: boolean
      myColor: string
      selectorColor: string
      onlineId: string
      hostInputValue: string
      host: Peer.DataConnection | null
      clients: { [key: string]: Peer.DataConnection }
      // clientIds: string[]
      // connections: { [key: string]: Peer.DataConnection }
      // editorText: EditorValue
    }) => (
      <Drawer anchor="right" variant="permanent">
        {/* <Divider horizontal>Color</Divider> */}
        {/* <List disablePadding> */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>Multiplayer</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <TextField id="filled-basic" label="Filled" variant="filled" />
          </AccordionDetails>
        </Accordion>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>Settings</Typography>
          </AccordionSummary>
          <AccordionDetails>
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
              styles={{
                default: {
                  // clear: { color: '#ffffff' },
                  compact: {
                    // justifySelf: 'stretch',
                    backgroundColor: '#e8e8e8',
                    // marginLeft: 'auto',
                    // left: 'auto',
                    // transform: 'translateX(-50%)',
                    // marginRight: 'auto',
                  },
                  // Compact: { color: '#ffffff' },
                },
              }}
              color={pickingMe ? myColor : selectorColor}
              onChangeComplete={(color) => {
                if (pickingMe) {
                  this.updateUserdata({ color: color.hex })
                  localStorage.color = color.hex
                } else {
                  this.setState({ selectorColor: color.hex })
                  this.updateSelected((cell) => {
                    cell.color = color.hex
                  })
                }
              }}
            />
          </AccordionDetails>
        </Accordion>
        <ListItem>testing dis shiz</ListItem>
        <ListItem>testing big time</ListItem>
        <ListItem>testing lets go</ListItem>
        <ListItem>testing dis shiz</ListItem>
        <ListItem>testing dis shiz</ListItem>
        {/* </List> */}
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
              this.setState({ hostInputValue: event.target.value })
            }}
            value={hostInputValue}
          />
          <span style={{ float: 'right' }}>
            {host
              ? 'CLIENT'
              : Object.keys(clients).length !== 0
              ? 'HOST'
              : 'NOT CONNECTED'}
          </span>
        </span>
        <br />
        {this.state.host && 'Host is: ' + this.state.host.peer}
        {Object.keys(clients).length !== 0 &&
          'Clients are: ' + Object.keys(clients).join(', ')}
        <Divider horizontal>Notes</Divider>
        <TextareaAutosize />
      </Drawer>
    ),
  )

  render = () => {
    // I just like this pattern, idk. typing "this.state.<prop>" gets annoying
    const {
      image,
      boardStateIndex,
      color: myColor,
      pickingMe,
      onlineId,
      selectedIndices,
      selectorIndex,
      multiUserdata,
      selectorColor,
      clients,
      host,
      hostInputValue,
      conflicts,
      editorText,
    } = this.state

    return (
      <PageContainer>
        <Helmet>
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/icon?family=Material+Icons"
          />
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap"
          />

          <title>Sudoku Assistant</title>
          <meta name="description" content="Sudoku solvey helpey" />
        </Helmet>
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
              style={{ zIndex: 100 }}
              image={image}
              id="sudoku-image"
            />
            {this.boardStates[boardStateIndex] && (
              <SudokuGrid style={{ padding: image.imageData ? '1px' : '2px' }}>
                {(this.boardStates[boardStateIndex] as CellData[]).map(
                  (cell, index) => {
                    const selectorConnKey = Object.keys(multiUserdata).find(
                      (key) =>
                        key !== onlineId &&
                        multiUserdata[key].selectorIndex === index,
                    )
                    const selectedConnKey = Object.keys(multiUserdata).find(
                      (key) =>
                        key !== onlineId &&
                        multiUserdata[key]?.selectedIndices?.includes(index),
                    )

                    return (
                      <GridCell
                        select={this.select}
                        boxGap={image.imageData ? '1px' : '2px'}
                        cellGap={image.imageData ? '0px' : '1px'}
                        key={index}
                        conflict={this.state.conflicts[index]}
                        selectedColor={
                          // Check if in the list
                          selectedIndices.includes(index)
                            ? myColor
                            : selectedConnKey !== undefined
                            ? multiUserdata[selectedConnKey].color
                            : null
                        }
                        selectorColor={
                          selectorIndex === index
                            ? myColor
                            : selectorConnKey !== undefined
                            ? multiUserdata[selectorConnKey].color
                            : null
                        }
                        data={cell}
                        index={index}
                        imageLoaded={!!image.imageData}
                      />
                    )
                  },
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
          hostInputValue={hostInputValue}
          // editorText={editorText}
          host={host}
          clients={clients}
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
