import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from '../stores/gameStore'
import { useExtensionStore } from '../stores/extensionStore'
import Sudoku from '../solver-extensions/Sudoku'

describe('multi-color cells', () => {
  beforeEach(() => {
    useGameStore.getState().initializeBoard(9, 9)
    useExtensionStore.getState().initialize(
      useGameStore.getState().gameState.boardState,
      [new Sudoku()],
    )
  })

  it('cells start with empty color array', () => {
    const cell = useGameStore.getState().gameState.boardState[0][0]
    expect(cell.color).toEqual([])
  })

  it('can add a single color', () => {
    useGameStore.getState().dispatch((draft) => {
      draft.boardState[0][0].color.push('#ff0000')
    }, 'user1')
    expect(useGameStore.getState().gameState.boardState[0][0].color).toEqual([
      '#ff0000',
    ])
  })

  it('can add multiple colors', () => {
    useGameStore.getState().dispatch((draft) => {
      draft.boardState[0][0].color.push('#ff0000')
      draft.boardState[0][0].color.push('#00ff00')
      draft.boardState[0][0].color.push('#0000ff')
    }, 'user1')
    expect(useGameStore.getState().gameState.boardState[0][0].color).toEqual([
      '#ff0000',
      '#00ff00',
      '#0000ff',
    ])
  })

  it('can toggle a color (remove if present)', () => {
    useGameStore.getState().dispatch((draft) => {
      draft.boardState[0][0].color.push('#ff0000')
      draft.boardState[0][0].color.push('#00ff00')
    }, 'user1')
    // Remove #ff0000
    useGameStore.getState().dispatch((draft) => {
      const cell = draft.boardState[0][0]
      const idx = cell.color.indexOf('#ff0000')
      if (idx >= 0) cell.color.splice(idx, 1)
    }, 'user1')
    expect(useGameStore.getState().gameState.boardState[0][0].color).toEqual([
      '#00ff00',
    ])
  })

  it('can clear all colors', () => {
    useGameStore.getState().dispatch((draft) => {
      draft.boardState[0][0].color.push('#ff0000')
      draft.boardState[0][0].color.push('#00ff00')
    }, 'user1')
    useGameStore.getState().dispatch((draft) => {
      draft.boardState[0][0].color = []
    }, 'user1')
    expect(useGameStore.getState().gameState.boardState[0][0].color).toEqual([])
  })
})
