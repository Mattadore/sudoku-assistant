import * as React from 'react'
// import Link from 'gatsby-link'
import '../helper'
import { graphql } from 'gatsby'
import { CompactPicker } from 'react-color'
import styled from '@emotion/styled'
import { produce } from 'immer'
// import { Divider, Button } from 'semantic-ui-react'
import {
  Accordion,
  TextareaAutosize,
  Divider,
  Button,
  Drawer,
  Container,
  Box,
} from '@mui/material'
import {
  getBoardDiff,
  getDiff,
  getDeepDiff,
  preprocessImage,
  inplaceMerge,
  createMerge,
  stringIndex,
  splitIndex,
} from 'helper'
import { GridCell } from 'components'
import type { Peer, DataConnection } from 'peerjs'
import { SolverExtensionManager, Extensions } from 'solver-extensions'
import chroma from 'chroma-js'
import { ReactNode } from 'react'
import { Helmet } from 'react-helmet'
import '@fontsource/roboto/300.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'

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

type SudokuImageData = {
  leftEdge: number
  rightEdge: number
  topEdge: number
  bottomEdge: number
  imageData: ImageData | null
}

const isBrowser = typeof window !== 'undefined'

const SudokuImageCanvas = styled.canvas<{
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

// const PageContainer = styled.div`
//   display: flex;
//   width: 100%;
//   height: 100vh;
//   flex-direction: row;
// `

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
  user-select: none;
  cursor: default;
`

const GridBackground = styled.div`
  position: relative;
  margin: 0;
  padding: 0px;
  background-color: #000000;
  z-index: 0;
  display: flex;
`

const colorPickerColors = [
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
]

type HostToClientData = {
  state?: BoardState
  userdataMap?: { [connectionKey: string]: Diff<Userdata> }
  image?: {
    file: Blob
    filetype: string
  }
}

// type ClientToHostCommand = 'undo' | 'redo'

type ClientToHostData = {
  userdataDiff?: Diff<Userdata>
  boardupdate?: { [key: string]: CellDiff }
  traverseHistory?: number
}

interface PageState {
  multiUserdata: { [key: string]: Userdata }
  myUserdata: Userdata
  selectedColor: string
  host: DataConnection | null
  clients: Map<string, DataConnection>
  pickingMe: boolean
  boardStateIndex: number
  onlineId: string
  hostId: string | null
  hostIdText: string
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
    myUserdata: {
      selectedIndices: [],
      selectorIndex: null,
      color:
        isBrowser && typeof localStorage.color === 'string'
          ? localStorage.color
          : '#ffcc00',
    },
    selectedColor: '#ffffff',
    host: null,
    clients: new Map(),
    pickingMe: false,
    boardStateIndex: 0,
    onlineId: 'offline',
    hostId: null,
    hostIdText: '',
    image: {
      leftEdge: 0,
      rightEdge: 0,
      topEdge: 0,
      bottomEdge: 0,
      imageData: null,
    },
  }

  conflicts: ConflictMatrix = []
  peer: Peer | null = null

  numRows = 9
  numColumns = 9
  boardStates: BoardState[] = [[]]
  extensionManager = new SolverExtensionManager()

  currentFile: Blob | null = null
  currentFileType: string | null = null

  constructor(props: PageState) {
    super(props)
    for (let row = 0; row < this.numRows; ++row) {
      this.boardStates[0].push([])
      for (let column = 0; column < this.numColumns; ++column) {
        this.boardStates[0][row].push({
          number: null,
          center: { numbers: [], letters: [] },
          topLeftCorner: { numbers: [], letters: [] },
          bottomRightCorner: { numbers: [], letters: [] },
          color: null,
        })
      }
    }
    this.extensionManager.initialize(this.boardStates[0], ['Sudoku'])
    this.conflicts = this.extensionManager.getConflictMatrix()
    // window.onbeforeunload = () => 'Are you sure you want to abandon the doku?'
  }

  // useful to give host init better typing
  sendDataToHost = (host: DataConnection, payload: ClientToHostData) => {
    host.send(payload)
  }

  // useful to give client init better typing
  sendDataToClient = (client: DataConnection, payload: HostToClientData) => {
    client.send(payload)
  }

  updateHost = (payload: ClientToHostData) => {
    if (this.state.host) {
      this.sendDataToHost(this.state.host, payload)
    }
  }

  updateClients = (payload: HostToClientData) => {
    for (const [clientId, client] of this.state.clients) {
      this.sendDataToClient(client, payload)
    }
  }

  // sendUpdate = (payload: ClientToHostData) => {
  //   if (this.state.clients.size !== 0) {
  //     this.hostProcessData(this.state.onlineId, payload)
  //   }
  //   this.updateHost(payload)
  // }

  select = (
    index: string,
    event: KeyboardEvent | React.MouseEvent<HTMLDivElement, MouseEvent>,
    multi = false,
  ) => {
    if (event.detail === 2) {
      const [row, col] = splitIndex(index)
      const number =
        this.boardStates[this.state.boardStateIndex][row][col].number
      if (number) {
        this.selectCellsIf((cell) => cell.number === number)
      }
      return
    }
    const { myUserdata, image } = this.state
    // if (!event.altKey) {
    this.updateUserdata({ selectorIndex: index })
    // }
    if (event.ctrlKey) {
      if (myUserdata.selectedIndices.includes(index)) {
        this.updateUserdata({
          selectedIndices: myUserdata.selectedIndices.filter(
            (value) => value !== index,
          ),
        })
      }
    } else if (event.shiftKey || multi) {
      if (
        typeof myUserdata.selectedIndices.find((value) => value === index) ===
        'undefined'
      ) {
        this.updateUserdata({
          selectedIndices: myUserdata.selectedIndices.concat(index),
        })
      }
      // } else if (event.altKey) {
      //   if (!image.imageData) {
      //     return
      //   }
      //   if ('clientX' in event) {
      //     const canvas = document.getElementById(
      //       'sudoku-image',
      //     ) as HTMLCanvasElement
      //     const rect = canvas.getBoundingClientRect()
      //     const x = Math.round(
      //       ((event.clientX - rect.x) * image.imageData.width) /
      //         (rect.right - rect.left),
      //     )
      //     const y = Math.round(
      //       ((event.clientY - rect.y) * image.imageData.height) /
      //         (rect.bottom - rect.top),
      //     )

      //     if (canvas.getContext('2d')?.getImageData(x, y, 1, 1).data[3] === 255) {
      //       const context = canvas.getContext('2d')
      //       if (!context) {
      //         throw 'Invalid context'
      //       }
      //       const color = chroma([
      //         ...context.getImageData(x, y, 1, 1).data.slice(0, 3),
      //       ])
      //       this.setState({ selectedColor: color.hex() })
      //       this.mutateSelectedCells((cell) => {
      //         cell.color = color.hex()
      //       })
      //     }
      //   }
    } else {
      this.updateUserdata({ selectedIndices: [index] })
    }
  }

  // componentDidUpdate = (prevProps: any, prevState: PageState) => {
  //   if (prevState.boardStateIndex !== this.state.boardStateIndex) {
  //     // const conflicts = validate(
  //     //   this.boardStates[this.state.boardStateIndex],
  //     //   this.extensionManager,
  //     // )
  //   }
  // }

  updateUserdata = (update: Diff<Userdata>) => {
    // this.setState((state) => ({
    //   myUserdata: produce(state.myUserdata, update),
    // }))
    this.setState((state) => ({
      myUserdata: createMerge(state.myUserdata, update),
    }))
    const { host } = this.state
    if (host !== null) {
      this.updateHost({ userdataDiff: update })
    } else {
      this.updateClients({ userdataMap: { [this.state.onlineId]: update } })
    }
  }

  updateConflicts = (
    indexBefore: number,
    indexAfter: number,
    diff: ReturnType<typeof getBoardDiff> | null = null,
  ): void => {
    const stateBefore = this.boardStates[indexBefore]
    const stateAfter = this.boardStates[indexAfter]
    if (diff === null) {
      diff = getBoardDiff(stateBefore, stateAfter)
    }
    const changed: string[] = []
    for (let key in diff) {
      const [row, col] = splitIndex(key)
      if (stateBefore[row][col].number !== stateAfter[row][col].number) {
        changed.push(key)
      }
    }
    this.extensionManager.updateCellConflicts(
      this.boardStates[indexAfter],
      changed,
    )
  }

  mutateBoard = (update: (method: BoardState) => void): void => {
    const { boardStateIndex } = this.state
    //useCallback(
    const out = produce(
      this.boardStates[boardStateIndex],
      (cellsDraft: BoardState) => {
        update(cellsDraft)
      },
    )
    const diff = getBoardDiff(this.boardStates[boardStateIndex], out)
    this.boardStates.splice(boardStateIndex + 1, this.boardStates.length)
    this.boardStates.push(out)
    this.updateConflicts(boardStateIndex, boardStateIndex + 1)
    if (this.state.hostId !== null) {
      this.updateHost({ boardupdate: diff })
    } else {
      this.updateClients({ state: out })
    }

    this.setState((state) => ({ boardStateIndex: state.boardStateIndex + 1 }))
  }

  traverseBoardHistory = (amount: number): void => {
    const { boardStateIndex, hostId } = this.state
    if (!hostId) {
      const newIndex = boardStateIndex + amount
      if (newIndex > 0 && newIndex < this.boardStates.length - 1) {
        this.updateConflicts(boardStateIndex, boardStateIndex + amount)
        this.setState({
          boardStateIndex: boardStateIndex + amount,
        })
        this.updateClients({
          state: this.boardStates[boardStateIndex + amount],
        })
      }
    } else {
      this.updateHost({ traverseHistory: amount })
    }
  }

  // Applies a transformation to all selected cells
  mutateSelectedCells = (update: (cell: CellData) => void): void => {
    const { selectedIndices } = this.state.myUserdata
    this.mutateBoard((cells) => {
      for (const selected of selectedIndices) {
        const [row, column] = splitIndex(selected)
        update(cells[row][column])
      }
    })
  }

  doAllSelectedCells = (test: (cell: CellData) => boolean): boolean => {
    const { selectedIndices } = this.state.myUserdata
    const boardState = this.boardStates[this.state.boardStateIndex]
    for (const selected of selectedIndices) {
      const [row, column] = splitIndex(selected)
      if (!test(boardState[row][column])) {
        return false
      }
    }
    return true
  }

  selectCellsIf = (test: (cell: CellData) => boolean): void => {
    const selectedIndices: string[] = []
    const boardState = this.boardStates[this.state.boardStateIndex]
    for (let row = 0; row < boardState.length; ++row) {
      for (let col = 0; col < boardState[row].length; ++col) {
        if (test(boardState[row][col])) {
          selectedIndices.push(stringIndex(row, col))
        }
      }
    }
    this.updateUserdata({ selectedIndices })
  }

  toggleAnnotation(annotation: string | number, location: AnnotationLocation) {
    const isNumber = typeof annotation == 'number'
    const container = isNumber ? 'numbers' : 'letters'
    if (location == 'number' && typeof annotation == 'string') return
    // If the annotation isn't in all boxes, we're toggling on; else, toggle off.
    const enable = !this.doAllSelectedCells((cell) => {
      if (location == 'number') {
        return cell.number == annotation
      }
      return (cell[location][container] as any).includes(annotation)
    })

    this.mutateSelectedCells((cell) => {
      if (location == 'number') {
        if (typeof annotation == 'string') return
        cell.number = enable ? annotation : null
        return
      }
      if (enable) {
        if (!(cell[location][container] as any).includes(annotation)) {
          ;(cell[location][container] as any).push(annotation)
          cell[location][container].sort()
        }
      } else {
        cell[location][container] = (cell[location][container] as any).filter(
          (value: string | number) => annotation !== value,
        )
        cell[location][container].sort()
      }
    })
  }

  keyCallback = (event: KeyboardEvent) => {
    const { myUserdata } = this.state
    if (myUserdata.selectorIndex === null) {
      return
    }
    // Use regex to test if digit btwn 1-9
    if (/^[1-9A-Za-z]$/.test(event.key) || /^[!@#$%^&*(]$/.test(event.key)) {
      if (event.altKey || event.ctrlKey) {
        //shit so annoying
        event.preventDefault()
      }

      let convertShift = ['!', '@', '#', '$', '%', '^', '&', '*', '(']
      let typedKey = event.key
      if (convertShift.indexOf(typedKey) !== -1) {
        typedKey = (convertShift.indexOf(event.key) + 1).toString()
      }
      const isNumber = !isNaN(parseInt(typedKey))
      const keyVal = isNumber ? parseInt(typedKey) : typedKey.toUpperCase()

      if (event.altKey && event.shiftKey) {
        this.toggleAnnotation(keyVal, 'bottomRightCorner')
      } else if (event.altKey) {
        this.toggleAnnotation(keyVal, 'topLeftCorner')
      } else if (event.shiftKey) {
        this.toggleAnnotation(keyVal, 'center')
      } else if (isNumber) {
        this.toggleAnnotation(keyVal, 'number')
      }
      if (isNumber) {
        return
      }
    }

    const [row, column] = splitIndex(myUserdata.selectorIndex)
    switch (event.key) {
      case 'y':
        if (event.ctrlKey) {
          event.preventDefault()
          this.traverseBoardHistory(1)
        }
        break
      case 'z':
        if (event.ctrlKey) {
          event.preventDefault()
          this.traverseBoardHistory(-1)
        }
        break
      case 'a':
        if (event.ctrlKey) {
          event.preventDefault()
          this.selectCellsIf(() => true)
        }
        break
      case 'ArrowLeft':
        if (column > 0) {
          this.select(stringIndex(row, column - 1), event)
        }
        break
      case 'ArrowRight':
        if (column < this.numColumns - 1) {
          this.select(stringIndex(row, column + 1), event)
        }
        break
      case 'ArrowUp':
        if (row > 0) {
          this.select(stringIndex(row - 1, column), event)
        }
        break
      case 'ArrowDown':
        if (row < this.numRows - 1) {
          this.select(stringIndex(row + 1, column), event)
        }
        break
      case 'Delete':
        if (event.ctrlKey) {
          this.mutateSelectedCells((cell) => {
            if (cell.color) {
              cell.color = null
            }
          })
        } else {
          this.mutateSelectedCells((cell) => {
            if (cell.number) {
              cell.number = null
            } else {
              cell.center = { letters: [], numbers: [] }
              cell.bottomRightCorner = { letters: [], numbers: [] }
              cell.topLeftCorner = { letters: [], numbers: [] }
            }
          })
        }
        break
    }
  }

  fileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.length) {
      const file = event.target.files[0]
      const blob = new Blob([file], { type: file.type })
      this.currentFile = blob
      this.currentFileType = file.type
      this.updateClients({
        image: {
          file: blob,
          filetype: file.type,
        },
      })
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
      if (!context) {
        throw 'Invalid context'
      }
      canvas.width = image.width
      canvas.height = image.height
      context.drawImage(image, 0, 0)
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
      const [leftEdge, rightEdge, topEdge, bottomEdge] =
        preprocessImage(imageData)
      this.setState({
        image: { leftEdge, rightEdge, topEdge, bottomEdge, imageData },
      })
    }
  }

  // Process data from clients
  hostProcessData = (id: string, data: ClientToHostData) => {
    if (!data || Object.keys(data).length === 0) {
      console.error('Empty data received')
      return
    }
    if (data.userdataDiff !== undefined) {
      this.setState((state) => {
        const out = {
          multiUserdata: createMerge(state.multiUserdata, {
            id: data.userdataDiff,
          }),
        }
        console.log('data received: ', out)
        return out
      })
      this.updateClients({ userdataMap: { id: data.userdataDiff } })
      /*        if (data.userdataDiff !== undefined) {
      let diff: Diff<Userdata>
      this.setState((state) => {
        const out = {
          multiUserdata: createMerge(state.multiUserdata, {
            id: data.userdataDiff,
          }),
        }
        diff = getDeepDiff(state.multiUserdata, out.multiUserdata)
        this.updateClients({ userdataMap: { id: diff } })
        return out
      })*/
    }
    if (data.boardupdate !== undefined) {
      this.mutateBoard((cells) => {
        for (let index in data.boardupdate) {
          const [row, column] = splitIndex(index)
          inplaceMerge(cells[row][column], data.boardupdate[index])
        }
      })
    }
    if (data.traverseHistory !== undefined) {
      this.traverseBoardHistory(data.traverseHistory)
    }
  }

  // HOST connection setup
  connectionCallback = (conn: DataConnection) => {
    conn.on('close', () => {
      console.log('CLOSING')
      this.setState((state) => {
        let out = new Map(state.clients)
        out.delete(conn.peer)
        return {
          clients: out,
        }
      })
    })
    //When we have a client joining our hosted session
    conn.on('open', () => {
      this.setState((state) => {
        let out = new Map(state.clients)
        out.set(conn.peer, conn)
        return {
          clients: out,
        }
      })
      this.sendDataToClient(conn, {
        state: this.boardStates[this.state.boardStateIndex],
        userdataMap: {
          ...this.state.multiUserdata,
          [this.state.onlineId]: this.state.myUserdata,
        },
        ...(this.currentFile &&
          this.currentFileType && {
            image: { file: this.currentFile, filetype: this.currentFileType },
          }),
      })
    })
    conn.on('data', (data) => {
      this.hostProcessData(conn.peer, data as ClientToHostData)
    })
  }

  // CLIENT connection setup
  initiateClient = async () => {
    const hostId = this.state.hostIdText
    this.initializePeer()
    if (!this.peer) {
      throw 'Peer not defined'
    }
    const conn = this.peer.connect(hostId)

    //When we join a remote server
    conn.on('open', () => {
      this.sendDataToHost(conn, {
        userdataDiff: this.state.myUserdata,
      })
    })

    conn.on('data', (rawdata) => {
      const data = rawdata as HostToClientData
      if (!data || Object.keys(data).length === 0) {
        console.error('Empty data received')
        return
      }
      if (data.userdataMap !== undefined) {
        this.setState((state) => ({
          multiUserdata: {
            ...state.multiUserdata,
            [this.state.onlineId]: this.state.myUserdata,
          },
        }))
      }
      if (data.state !== undefined) {
        // TODO: make this less bad
        this.boardStates.push(data.state)
        this.setState((state) => ({
          boardStateIndex: state.boardStateIndex + 1,
        }))
      }
      if (data.image !== undefined) {
        const blob = new Blob([data.image.file], {
          type: data.image.filetype,
        })
        this.currentFile = blob
        this.imageLoad(blob)
      }
    })
    this.setState({
      hostId,
      host: conn,
    })
  }

  pageClicked = () => {
    this.updateUserdata({ selectorIndex: null })
  }

  initializePeer = async () => {
    if (this.peer) {
      return
    }
    const id = localStorage.getItem('id')
    const { Peer } = await import('peerjs')
    this.peer = id ? new Peer(id) : new Peer()
    this.peer.on('open', (id) => {
      localStorage.id = id
      this.setState({ onlineId: id })
    })
    this.peer.on('connection', this.connectionCallback)
  }

  componentDidMount = async () => {
    if (isBrowser) {
      await this.initializePeer()
      window.addEventListener('keydown', this.keyCallback)
      window.addEventListener('mousedown', this.pageClicked)
    }
  }

  componentWillUnmount = () => {
    if (this.peer) {
      this.peer.off('connection', this.connectionCallback)
    }
    if (isBrowser) {
      window.removeEventListener('keydown', this.keyCallback)
      window.removeEventListener('mousedown', this.pageClicked)
    }
  }

  ImageCanvases = React.memo(({ image }: { image: SudokuImageData }) => (
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
  ))

  Sidebar = React.memo(
    ({
      pickingMe,
      myColor,
      selectedColor,
      onlineId,
      hostIdText,
      clients,
      host,
    }: {
      pickingMe: boolean
      myColor: string
      selectedColor: string
      onlineId: string
      hostIdText: string
      clients: Map<string, DataConnection>
      host: DataConnection | null
    }) => (
      <Drawer
        sx={{
          width: 300,
          flexShrink: 0,
          // '& .MuiDrawer-paper': {
          //   width: 300,
          //   boxSizing: 'border-box',
          // },
        }}
        variant="permanent"
        anchor="right"
      >
        <Divider>Color</Divider>
        <CompactPicker
          colors={colorPickerColors}
          color={pickingMe ? myColor : selectedColor}
          onChangeComplete={(color) => {
            // setColor(color.hex)
            if (pickingMe) {
              this.setState({ pickingMe: false })
              this.updateUserdata({ color: color.hex })
              localStorage.color = color.hex
            } else {
              this.setState({ selectedColor: color.hex })
              this.mutateSelectedCells((cell) => {
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
        <Divider>File</Divider>
        <input type="file" id="upload-button" onChange={this.fileInput} />
        <Divider>Multiplayer</Divider>
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
              this.setState({ hostIdText: event.target.value })
            }}
            value={hostIdText}
          />
          <span style={{ float: 'right' }}>
            {clients.size !== 0
              ? 'HOST'
              : host != null
              ? 'CLIENT'
              : 'NOT CONNECTED'}
          </span>
        </span>
        <br />
        {this.state.hostId && 'Host is: ' + this.state.hostId}
        {clients.size !== 0 &&
          'Clients are: ' +
            Array.from(clients, ([name, value]) => name).join(', ')}
        <Divider>Notes</Divider>
        <Accordion>
          <TextareaAutosize minRows={5} style={{ width: '100%' }} />
        </Accordion>
      </Drawer>
    ),
  )

  render = () => {
    const {
      image,
      boardStateIndex,
      myUserdata,
      multiUserdata,
      pickingMe,
      onlineId,
      selectedColor,
      hostIdText,
      clients,
      host,
    } = this.state
    return (
      <Box>
        <Button>hello</Button>
        <GridContainer>
          <GridBackground
            style={image.imageData ? { backgroundColor: '#ffffff' } : {}}
            onMouseDown={(e) => {
              //Stop click event from propagating to window, used for deselect checking
              e.stopPropagation()
            }}
          >
            <this.ImageCanvases image={image} />
            {this.boardStates[boardStateIndex] && (
              <SudokuGrid
                style={{
                  padding: image.imageData ? '1px' : '2px',
                }}
              >
                {this.boardStates[boardStateIndex].reduce<ReactNode[]>(
                  (out, rowData, row) => [
                    ...out,
                    ...rowData.map((cell, column) => {
                      const index = stringIndex(row, column)
                      return (
                        <GridCell
                          select={this.select}
                          key={index}
                          conflictData={this.conflicts[row][column]}
                          onlineId={onlineId}
                          myUserdata={myUserdata}
                          multiUserdata={multiUserdata}
                          data={cell}
                          index={index}
                          imageLoaded={!!image.imageData}
                        />
                      )
                    }),
                  ],
                  [],
                )}
              </SudokuGrid>
            )}
          </GridBackground>
        </GridContainer>
        <this.Sidebar
          pickingMe={pickingMe}
          myColor={myUserdata.color}
          selectedColor={selectedColor}
          onlineId={onlineId}
          hostIdText={hostIdText}
          clients={clients}
          host={host}
        />
      </Box>
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
