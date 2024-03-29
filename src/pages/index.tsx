import * as React from 'react'
// import Link from 'gatsby-link'
import '../helper'
import { graphql } from 'gatsby'
import { CompactPicker } from 'react-color'
import styled from '@emotion/styled'
import produce from 'immer'
import { Divider, Button, Accordion } from 'semantic-ui-react'
import { getDiff, preprocessImage } from 'helper'
import { GridCell } from 'components'
import type { Peer, DataConnection } from 'peerjs'

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

const isBrowser = typeof window !== 'undefined'

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
  state?: CellData[]
  pointerMap?: { [connectionKey: string]: number | null }
  colorMap?: { [connectionKey: string]: string }
  selectedMap?: { [connectionKey: string]: number[] }
  image?: {
    file: Blob
    filetype: string
  }
}

type ClientToHostData = {
  pointer?: number | null
  selected?: number[]
  boardupdate?: { [key: string]: CellDiff }
  color?: string
}

interface PageState {
  selectorIndex: number | null
  multiSelectorIndices: { [key: string]: number | null }
  selectedIndices: number[]
  multiSelectedIndices: { [key: string]: number[] }
  multiColors: { [key: string]: string }
  connections: { [key: string]: DataConnection }
  conflicts: boolean[]
  pickingMe: boolean
  myColor: string
  selectorColor: string
  boardStateIndex: number
  onlineId: string
  clientIds: string[]
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
    selectorIndex: null,
    multiSelectorIndices: {},
    selectedIndices: [],
    multiSelectedIndices: {},
    multiColors: {},
    connections: {},
    conflicts: [],
    pickingMe: false,
    myColor:
      isBrowser && typeof localStorage.color === 'string'
        ? localStorage.color
        : '#ffcc00',
    selectorColor: '#ffffff',
    boardStateIndex: 0,
    onlineId: 'offline',
    hostId: null,
    hostIdText: '',
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

  mutateBoard = (update: (method: CellData[]) => void): void => {
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
      this.updateClients({ state: out })
    } else if (this.state.hostId !== null) {
      const diff = getDiff(this.boardStates[boardStateIndex], out)
      console.log('DIFF:', diff)
      this.updateHost({ boardupdate: diff })
    }

    this.setState((state) => ({ boardStateIndex: state.boardStateIndex + 1 }))
  }

  // useful to give host init better typing
  sendDataToHost = (client: DataConnection, payload: ClientToHostData) => {
    client.send(payload)
  }

  // useful to give client init better typing
  sendDataToClient = (client: DataConnection, payload: HostToClientData) => {
    client.send(payload)
  }

  updateHost = (payload: ClientToHostData) => {
    if (this.state.hostId) {
      this.sendDataToHost(this.state.connections[this.state.hostId], payload)
    }
  }

  updateClients = (payload: HostToClientData) => {
    if (this.state.clientIds.length !== 0) {
      for (const clientId of this.state.clientIds) {
        this.sendDataToClient(this.state.connections[clientId], payload)
      }
    }
  }

  sendUpdate = (payload: ClientToHostData) => {
    if (this.state.clientIds.length !== 0) {
      this.hostProcessData(this.state.onlineId, payload)
    }
    this.updateHost(payload)
  }

  select = (
    index: number,
    event: KeyboardEvent | React.MouseEvent<HTMLDivElement, MouseEvent>,
    multi = false,
  ) => {
    const { connections, selectedIndices, image } = this.state
    if (!event.altKey) {
      this.setState({ selectorIndex: index })
      this.sendUpdate({ pointer: index })
    }
    if (event.ctrlKey) {
      if (selectedIndices.includes(index)) {
        const selected = this.state.selectedIndices.filter(
          (value) => value !== index,
        )
        this.setState({ selectedIndices: selected })
        this.sendUpdate({ selected })
      }
    } else if (event.shiftKey || multi) {
      if (
        typeof selectedIndices.find((value) => value === index) === 'undefined'
      ) {
        const selected = this.state.selectedIndices.concat(index)
        this.setState({ selectedIndices: selected })
        this.sendUpdate({ selected })
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
          const context = canvas.getContext('2d')
          if (!context) {
            throw 'Invalid context'
          }
          const color = chroma([
            ...context.getImageData(x, y, 1, 1).data.slice(0, 3),
          ])
          console.log('HSV:', color.hsv(), 'HCL:', color.hcl())
          this.setState({ selectorColor: color.hex() })
          this.mutateSelectedCells((cell) => {
            cell.color = color.hex()
          })
        }
      }
    } else {
      this.setState({ selectedIndices: [index] })
      this.sendUpdate({ selected: [index] })
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

  // Applies a transformation to all selected cells
  mutateSelectedCells = (update: (cell: CellData) => void): void => {
    const { selectedIndices } = this.state
    this.mutateBoard((cells: any) => {
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
        this.mutateSelectedCells((cell) => {
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
        this.mutateSelectedCells((cell) => {
          if (!cell.center.includes(shiftedKey)) {
            cell.center.push(shiftedKey)
            cell.center.sort()
          } else {
            cell.center = cell.center.filter((value) => shiftedKey !== value)
            cell.center.sort()
          }
        })
      } else {
        this.mutateSelectedCells((cell) => {
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
          !this.state.hostId &&
          event.ctrlKey &&
          boardStateIndex < this.boardStates.length - 1
        ) {
          event.preventDefault()
          this.setState({
            boardStateIndex: boardStateIndex + 1,
          })
          this.updateClients({ state: this.boardStates[boardStateIndex + 1] })
        }
        break
      case 'z':
        if (!this.state.hostId && event.ctrlKey && boardStateIndex > 0) {
          event.preventDefault()
          this.setState((state) => ({
            boardStateIndex: state.boardStateIndex - 1,
          }))
          this.updateClients({ state: this.boardStates[boardStateIndex - 1] })
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
          this.sendUpdate({ selected: allIndices })
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
        this.mutateSelectedCells((cell) => {
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
    if (data.pointer) {
      this.setState({
        multiSelectorIndices: {
          ...this.state.multiSelectorIndices,
          [id]: data.pointer,
        },
      })
      this.updateClients({ pointerMap: { [id]: data.pointer } })
    }
    if (data.selected) {
      this.setState({
        multiSelectedIndices: {
          ...this.state.multiSelectedIndices,
          [id]: data.selected,
        },
      })
      this.updateClients({ selectedMap: { [id]: data.selected } })
    }
    if (data.boardupdate) {
      this.mutateBoard((cells: Array<CellData>) => {
        for (let index in data.boardupdate) {
          Object.assign(cells[parseInt(index)], data.boardupdate[index])
        }
      })
    }
    if (data.color) {
      this.setState({
        multiColors: {
          ...this.state.multiColors,
          [id]: data.color,
        },
      })
      this.updateClients({ colorMap: { [id]: data.color } })
    }
  }

  // HOST connection setup
  connectionCallback = (conn: DataConnection) => {
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
      this.sendDataToClient(conn, {
        state: this.boardStates[this.state.boardStateIndex],
        pointerMap: this.state.multiSelectorIndices,
        selectedMap: this.state.multiSelectedIndices,
        colorMap: this.state.multiColors,
        ...(this.currentFile &&
          this.currentFileType && {
            image: { file: this.currentFile, filetype: this.currentFileType },
          }),
      })
      conn.on('data', (data) => {
        this.hostProcessData(conn.peer, data as ClientToHostData)
      })
      this.setState((state) => ({ clientIds: [...state.clientIds, conn.peer] }))
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
        color: this.state.myColor,
        pointer: this.state.selectorIndex,
        selected: this.state.selectedIndices,
      })

      conn.on('data', (rawdata) => {
        const data = rawdata as HostToClientData
        if (!data || Object.keys(data).length === 0) {
          console.error('Empty data received')
          return
        }
        if (data.pointerMap) {
          this.setState((state) => ({
            multiSelectorIndices: {
              ...state.multiSelectorIndices,
              ...data.pointerMap,
            },
          }))
        }
        if (data.selectedMap) {
          this.setState((state) => ({
            multiSelectedIndices: {
              ...state.multiSelectedIndices,
              ...data.selectedMap,
            },
          }))
        }
        if (data.state) {
          this.boardStates.push(data.state)
          this.setState((state) => ({
            boardStateIndex: state.boardStateIndex + 1,
          }))
        }
        if (data.image) {
          const blob = new Blob([data.image.file], {
            type: data.image.filetype,
          })
          this.currentFile = blob
          this.imageLoad(blob)
        }
        if (data.colorMap) {
          this.setState((state) => ({
            multiColors: {
              ...state.multiColors,
              ...data.colorMap,
            },
          }))
        }
      })
    })
    this.setState((state) => ({
      hostId,
      connections: {
        ...state.connections,
        [hostId]: conn,
      },
    }))
  }

  pageClicked = () => {
    this.setState({ selectorIndex: null })
    this.sendUpdate({ pointer: null })
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

  Sidebar = React.memo(
    ({
      pickingMe,
      myColor,
      selectorColor,
      onlineId,
      hostIdText,
      clientIds,
      connections,
    }: {
      pickingMe: boolean
      myColor: string
      selectorColor: string
      onlineId: string
      hostIdText: string
      clientIds: string[]
      connections: { [key: string]: DataConnection }
    }) => (
      <SidebarContainer>
        <Divider horizontal>Color</Divider>
        <CompactPicker
          colors={colorPickerColors}
          color={pickingMe ? myColor : selectorColor}
          onChangeComplete={(color) => {
            // setColor(color.hex)
            if (pickingMe) {
              this.setState({ myColor: color.hex, pickingMe: false })
              this.sendUpdate({ color: color.hex })
              localStorage.color = color.hex
            } else {
              this.setState({ selectorColor: color.hex })
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
              this.setState({ hostIdText: event.target.value })
            }}
            value={hostIdText}
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
        {this.state.hostId && 'Host is: ' + this.state.hostId}
        {clientIds.length !== 0 && 'Clients are: ' + clientIds.join(', ')}
        <Divider horizontal>Notes</Divider>
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
    const {
      image,
      boardStateIndex,
      myColor,
      pickingMe,
      onlineId,
      selectedIndices,
      selectorIndex,
      selectorColor,
      multiColors,
      multiSelectedIndices,
      multiSelectorIndices,
      hostIdText,
      clientIds,
      connections,
      conflicts,
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
                {(this.boardStates[boardStateIndex] as CellData[]).map(
                  (cell, index) => {
                    const selectorConnKey = Object.keys(
                      multiSelectorIndices,
                    ).find(
                      (key) =>
                        key !== onlineId && multiSelectorIndices[key] === index,
                    )
                    const selectedConnKey = Object.keys(
                      multiSelectedIndices,
                    ).find(
                      (key) =>
                        key !== onlineId &&
                        multiSelectedIndices[key].includes(index),
                    )

                    return (
                      <GridCell
                        select={this.select}
                        boxGap={image.imageData ? '1px' : '2px'}
                        cellGap={image.imageData ? '0px' : '1px'}
                        key={index}
                        conflict={conflicts[index]}
                        selectedColor={
                          // Check if in the list
                          selectedIndices.includes(index)
                            ? myColor
                            : selectedConnKey !== undefined
                            ? multiColors[selectedConnKey]
                            : null
                        }
                        selectorColor={
                          selectorIndex === index
                            ? myColor
                            : selectorConnKey !== undefined
                            ? multiColors[selectorConnKey]
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
          hostIdText={hostIdText}
          clientIds={clientIds}
          connections={connections}
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
