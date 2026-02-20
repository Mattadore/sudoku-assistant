import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useGameStore } from '../stores/gameStore'
import { useNetworkStore } from '../stores/networkStore'
import { useExtensionStore } from '../stores/extensionStore'
import Sudoku from '../solver-extensions/Sudoku'

describe('networkStore', () => {
  beforeEach(() => {
    // Reset all stores
    useGameStore.getState().initializeBoard(9, 9)
    useExtensionStore.getState().initialize(
      useGameStore.getState().gameState.boardState,
      [new Sudoku()],
    )
    // Reset network store to default
    useNetworkStore.setState({
      peer: null,
      onlineId: 'test-user',
      host: null,
      clients: new Map(),
      multiUserdata: {},
    })
  })

  describe('networkDispatch', () => {
    it('dispatches locally when standalone (no host, no clients)', () => {
      useNetworkStore.getState().networkDispatch((draft) => {
        draft.boardState[0][0].number = 5
      })
      expect(useGameStore.getState().gameState.boardState[0][0].number).toBe(5)
    })

    it('dispatches locally and broadcasts to clients when host', () => {
      // Mock a client connection
      const mockSend = vi.fn()
      const mockClient = { send: mockSend } as any
      useNetworkStore.setState({
        clients: new Map([['client1', mockClient]]),
      })

      useNetworkStore.getState().networkDispatch((draft) => {
        draft.boardState[0][0].number = 7
      })

      // Local state updated
      expect(useGameStore.getState().gameState.boardState[0][0].number).toBe(7)
      // Broadcast sent to client
      expect(mockSend).toHaveBeenCalledTimes(1)
      const sentData = mockSend.mock.calls[0][0]
      expect(sentData.state).toBeDefined()
      expect(sentData.state[0][0].number).toBe(7)
    })

    it('dispatches locally and sends patches to host when client', () => {
      // Mock a host connection
      const mockSend = vi.fn()
      const mockHost = { send: mockSend } as any
      useNetworkStore.setState({ host: mockHost })

      useNetworkStore.getState().networkDispatch((draft) => {
        draft.boardState[2][3].number = 4
      })

      // Local state updated (optimistic)
      expect(useGameStore.getState().gameState.boardState[2][3].number).toBe(4)
      // Patches sent to host
      expect(mockSend).toHaveBeenCalledTimes(1)
      const sentData = mockSend.mock.calls[0][0]
      expect(sentData.patches).toBeDefined()
      expect(sentData.patches.length).toBeGreaterThan(0)
    })

    it('does not send if dispatch produces no changes', () => {
      const mockSend = vi.fn()
      const mockClient = { send: mockSend } as any
      useNetworkStore.setState({
        clients: new Map([['client1', mockClient]]),
      })

      useNetworkStore.getState().networkDispatch((_draft) => {
        // no-op
      })

      expect(mockSend).not.toHaveBeenCalled()
    })
  })

  describe('networkUndo / networkRedo', () => {
    it('host undo updates locally and broadcasts to clients', () => {
      const mockSend = vi.fn()
      const mockClient = { send: mockSend } as any
      useNetworkStore.setState({
        clients: new Map([['client1', mockClient]]),
      })

      // Place a number
      useNetworkStore.getState().networkDispatch((draft) => {
        draft.boardState[0][0].number = 5
      })
      expect(useGameStore.getState().gameState.boardState[0][0].number).toBe(5)
      mockSend.mockClear()

      // Undo
      useNetworkStore.getState().networkUndo()
      expect(useGameStore.getState().gameState.boardState[0][0].number).toBe(null)
      // Broadcast sent
      expect(mockSend).toHaveBeenCalledTimes(1)
      expect(mockSend.mock.calls[0][0].state[0][0].number).toBe(null)
    })

    it('host redo updates locally and broadcasts to clients', () => {
      const mockSend = vi.fn()
      const mockClient = { send: mockSend } as any
      useNetworkStore.setState({
        clients: new Map([['client1', mockClient]]),
      })

      useNetworkStore.getState().networkDispatch((draft) => {
        draft.boardState[0][0].number = 5
      })
      useNetworkStore.getState().networkUndo()
      mockSend.mockClear()

      useNetworkStore.getState().networkRedo()
      expect(useGameStore.getState().gameState.boardState[0][0].number).toBe(5)
      expect(mockSend).toHaveBeenCalledTimes(1)
      expect(mockSend.mock.calls[0][0].state[0][0].number).toBe(5)
    })

    it('client sends traverseHistory to host on undo', () => {
      const mockSend = vi.fn()
      const mockHost = { send: mockSend } as any
      useNetworkStore.setState({ host: mockHost })

      useNetworkStore.getState().networkUndo()
      expect(mockSend).toHaveBeenCalledWith({ traverseHistory: -1 })
    })

    it('client sends traverseHistory to host on redo', () => {
      const mockSend = vi.fn()
      const mockHost = { send: mockSend } as any
      useNetworkStore.setState({ host: mockHost })

      useNetworkStore.getState().networkRedo()
      expect(mockSend).toHaveBeenCalledWith({ traverseHistory: 1 })
    })
  })

  describe('updateUserdata', () => {
    it('updates local myUserdata', () => {
      useNetworkStore.getState().updateUserdata({ color: '#ff0000' })
      expect(useNetworkStore.getState().myUserdata.color).toBe('#ff0000')
    })

    it('sends userdataDiff to host when client', () => {
      const mockSend = vi.fn()
      const mockHost = { send: mockSend } as any
      useNetworkStore.setState({ host: mockHost })

      useNetworkStore.getState().updateUserdata({ color: '#00ff00' })

      expect(mockSend).toHaveBeenCalledWith({
        userdataDiff: { color: '#00ff00' },
      })
    })

    it('broadcasts userdataMap to clients when host', () => {
      const mockSend = vi.fn()
      const mockClient = { send: mockSend } as any
      useNetworkStore.setState({
        clients: new Map([['client1', mockClient]]),
        onlineId: 'host-id',
      })

      useNetworkStore.getState().updateUserdata({
        selectedIndices: ['0,0', '1,1'],
      })

      expect(mockSend).toHaveBeenCalledTimes(1)
      const sentData = mockSend.mock.calls[0][0]
      expect(sentData.userdataMap['host-id']).toEqual({
        selectedIndices: ['0,0', '1,1'],
      })
    })
  })
})
