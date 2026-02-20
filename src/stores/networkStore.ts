import { create } from 'zustand'
import type { Peer, DataConnection } from 'peerjs'
import type { Patch } from 'immer'
import { createMerge, inplaceMerge, splitIndex, preprocessImage } from 'helper'
import { useGameStore, GameState } from './gameStore'

const isBrowser = typeof window !== 'undefined'

type SudokuImageData = {
  leftEdge: number
  rightEdge: number
  topEdge: number
  bottomEdge: number
  imageData: ImageData | null
}

type HostToClientData = {
  state?: BoardState
  userdataMap?: { [connectionKey: string]: Diff<Userdata> }
  image?: {
    file: Blob
    filetype: string
  }
}

type ClientToHostData = {
  userdataDiff?: Diff<Userdata>
  boardupdate?: { [key: string]: CellDiff }
  patches?: Patch[]
  traverseHistory?: number
}

interface NetworkStore {
  // Connection state
  peer: Peer | null
  onlineId: string
  host: DataConnection | null
  clients: Map<string, DataConnection>

  // User state
  myUserdata: Userdata
  multiUserdata: { [key: string]: Userdata }

  // UI state
  hostIdText: string
  selectedColor: string
  pickingMe: boolean

  // Image state
  image: SudokuImageData
  currentFile: Blob | null
  currentFileType: string | null

  // Actions
  networkDispatch: (mutator: (draft: GameState) => void) => void
  networkUndo: () => void
  networkRedo: () => void
  initializePeer: () => Promise<void>
  joinGame: (hostId: string) => void
  disconnect: () => void
  updateUserdata: (update: Diff<Userdata>) => void
  setHostIdText: (text: string) => void
  setSelectedColor: (color: string) => void
  setPickingMe: (picking: boolean) => void
  handleFileInput: (file: File) => void
  loadImageFromBlob: (blob: Blob) => void
}

export const useNetworkStore = create<NetworkStore>()((set, get) => {
  // Helper: send typed data to host
  const sendToHost = (payload: ClientToHostData) => {
    const { host } = get()
    if (host) host.send(payload)
  }

  // Helper: broadcast typed data to all clients
  const sendToClients = (payload: HostToClientData) => {
    for (const [, client] of get().clients) {
      client.send(payload)
    }
  }

  // Process data from clients (host-side)
  const handleClientData = (peerId: string, data: ClientToHostData) => {
    if (!data || Object.keys(data).length === 0) return

    let clientUpdate : HostToClientData = {}

    if (data.userdataDiff !== undefined) {
      set((state) => ({
        multiUserdata: createMerge(state.multiUserdata, {
          [peerId]: data.userdataDiff,
        }),
      }))
      clientUpdate.userdataMap = { [peerId]: data.userdataDiff }
    }

    if (data.boardupdate !== undefined) {
      const gameStore = useGameStore.getState()
      gameStore.dispatch((draft) => {
        for (const index in data.boardupdate) {
          const [row, column] = splitIndex(index)
          inplaceMerge(draft.boardState[row][column], data.boardupdate[index])
        }
      }, peerId)
      clientUpdate.state = useGameStore.getState().gameState.boardState
    }

    if (data.patches !== undefined) {
      const gameStore = useGameStore.getState()
      gameStore.applyRemotePatches(data.patches, peerId)
      clientUpdate.state = useGameStore.getState().gameState.boardState
    }

    if (data.traverseHistory !== undefined) {
      const gameStore = useGameStore.getState()
      if (data.traverseHistory < 0) {
        gameStore.undo(peerId)
      } else {
        gameStore.redo(peerId)
      }
      clientUpdate.state = useGameStore.getState().gameState.boardState
    }
    if (clientUpdate.state || clientUpdate.userdataMap) {
      sendToClients(clientUpdate)
    }
  }

  // Process data from host (client-side)
  const handleHostData = (data: HostToClientData) => {
    if (data.userdataMap) {
      set((state) => ({
        multiUserdata: createMerge(state.multiUserdata, data.userdataMap!),
      }))
    }

    if (data.state) {
      useGameStore.getState().loadFullState(data.state)
    }

    if (data.image) {
      const blob = new Blob([data.image.file], { type: data.image.filetype })
      get().loadImageFromBlob(blob)
    }
  }

  // Handle incoming client connection (host-side)
  const handleConnection = (conn: DataConnection) => {
    conn.on('close', () => {
      set((state) => {
        const newClients = new Map(state.clients)
        newClients.delete(conn.peer)
        return { clients: newClients }
      })
    })

    conn.on('open', () => {
      set((state) => {
        const newClients = new Map(state.clients)
        newClients.set(conn.peer, conn)
        return { clients: newClients }
      })

      // Send current state to new client
      const { myUserdata, multiUserdata, onlineId, currentFile, currentFileType } = get()
      const boardState = useGameStore.getState().gameState.boardState

      const payload: HostToClientData = {
        state: boardState,
        userdataMap: {
          ...multiUserdata,
          [onlineId]: { ...myUserdata } as any,
        },
      }

      if (currentFile && currentFileType) {
        payload.image = { file: currentFile, filetype: currentFileType }
      }

      conn.send(payload)

      conn.on('data', (data) => {
        handleClientData(conn.peer, data as ClientToHostData)
      })
    })
  }

  return {
    peer: null,
    onlineId: 'offline',
    host: null,
    clients: new Map(),

    myUserdata: {
      selectedIndices: [],
      selectorIndex: null,
      color: '#ffcc00',
    },
    multiUserdata: {},

    hostIdText: '',
    selectedColor: '#ffffff',
    pickingMe: false,

    image: {
      leftEdge: 0,
      rightEdge: 0,
      topEdge: 0,
      bottomEdge: 0,
      imageData: null,
    },
    currentFile: null,
    currentFileType: null,

    networkDispatch: (mutator) => {
      const { host, clients, onlineId } = get()
      const gameStore = useGameStore.getState()

      if (host) {
        // Client: dispatch locally for instant feedback, send patches to host
        const patches = gameStore.dispatch(mutator, onlineId)
        if (patches.length > 0) {
          sendToHost({ patches })
        }
      } else {
        // Host or standalone: dispatch locally
        const patches = gameStore.dispatch(mutator, onlineId)
        if (patches.length > 0 && clients.size > 0) {
          // Host: broadcast updated state to all clients
          sendToClients({
            state: useGameStore.getState().gameState.boardState,
          })
        }
      }
    },

    networkUndo: () => {
      const { host, clients, onlineId } = get()
      if (host) {
        // Client: delegate to host
        sendToHost({ traverseHistory: -1 })
      } else {
        useGameStore.getState().undo(onlineId)
        if (clients.size > 0) {
          sendToClients({
            state: useGameStore.getState().gameState.boardState,
          })
        }
      }
    },

    networkRedo: () => {
      const { host, clients, onlineId } = get()
      if (host) {
        // Client: delegate to host
        sendToHost({ traverseHistory: 1 })
      } else {
        useGameStore.getState().redo(onlineId)
        if (clients.size > 0) {
          sendToClients({
            state: useGameStore.getState().gameState.boardState,
          })
        }
      }
    },

    initializePeer: async () => {
      if (get().peer) return

      const savedId = isBrowser ? localStorage.getItem('id') : null
      const { Peer } = await import('peerjs')
      const peer = savedId ? new Peer(savedId) : new Peer()

      peer.on('open', (id) => {
        if (isBrowser) localStorage.id = id
        set({ onlineId: id, peer })
      })

      peer.on('connection', handleConnection)

      set({ peer })
    },

    joinGame: (hostId) => {
      const { peer } = get()
      if (!peer) return

      const conn = peer.connect(hostId)

      conn.on('open', () => {
        set({ host: conn })
        // Send initial userdata to host
        conn.send({ userdataDiff: get().myUserdata } as ClientToHostData)
      })

      conn.on('data', (data) => {
        handleHostData(data as HostToClientData)
      })

      conn.on('close', () => {
        set({ host: null })
      })

      set({ host: conn })
    },

    disconnect: () => {
      const { peer, host } = get()
      if (host) host.close()
      if (peer) peer.destroy()
      set({
        peer: null,
        host: null,
        clients: new Map(),
        onlineId: 'offline',
        multiUserdata: {},
      })
    },

    updateUserdata: (update) => {
      set((state) => ({
        myUserdata: createMerge(state.myUserdata, update),
      }))

      const { host, clients, onlineId } = get()
      if (host) {
        sendToHost({ userdataDiff: update })
      } else if (clients.size > 0) {
        sendToClients({ userdataMap: { [onlineId]: update } })
      }
    },

    setHostIdText: (text) => set({ hostIdText: text }),
    setSelectedColor: (color) => set({ selectedColor: color }),
    setPickingMe: (picking) => set({ pickingMe: picking }),

    handleFileInput: (file) => {
      const blob = new Blob([file], { type: file.type })
      set({ currentFile: blob, currentFileType: file.type })

      sendToClients({ image: { file: blob, filetype: file.type } })

      get().loadImageFromBlob(blob)
    },

    loadImageFromBlob: (blob) => {
      if (typeof window === 'undefined') return

      const canvas = document.getElementById(
        'sudoku-image',
      ) as HTMLCanvasElement | null
      if (!canvas) return

      const img = new Image()
      img.src = URL.createObjectURL(blob)
      img.onload = () => {
        canvas.width = img.width
        canvas.height = img.height
        const context = canvas.getContext('2d')
        if (!context) return
        context.drawImage(img, 0, 0)
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
        const [leftEdge, rightEdge, topEdge, bottomEdge] =
          preprocessImage(imageData)
        set({
          image: { leftEdge, rightEdge, topEdge, bottomEdge, imageData },
        })
      }
    },
  }
})
