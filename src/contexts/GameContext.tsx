// import * as React from 'react'
// import type { Peer, DataConnection } from 'peerjs'
// import { produce } from 'immer'
// import { DataContext, DataContextUpdaters } from './DataContext'
// import {
//   getBoardDiff,
//   getDiff,
//   getDeepDiff,
//   preprocessImage,
//   inplaceMerge,
//   createMerge,
//   stringIndex,
//   splitIndex,
// } from 'helper'

// type GameContextType = {
//   networkId: string
// }

// type GameContextProps = { dataUpdateMethods: DataContextUpdaters }

// type GameContextState = {
//   networkId: string
// }

// const GameContext = React.createContext<GameContextType>({} as any)

// class GameContextProvider extends React.Component<
//   React.PropsWithChildren<GameContextProps>,
//   GameContextState
// > {
//   static contextType = DataContext

//   declare context: React.ContextType<typeof DataContext>

//   oldContext: typeof this.context = {} as any

//   mutateBoard = (update: (method: BoardState) => void): void => {
//     const { boardStateIndex } = this.context
//     //useCallback(
//     const out = produce(this.context.boardState, (cellsDraft: BoardState) => {
//       update(cellsDraft)
//     })
//     const diff = getBoardDiff(this.context.boardState, out)
//     this.context.addBoardState(out)
//     this.updateConflicts(boardStateIndex, boardStateIndex + 1)
//     if (this.state.hostId !== null) {
//       this.updateHost({ boardupdate: diff })
//     } else {
//       this.updateClients({ state: out })
//     }

//     this.setState((state) => ({ boardStateIndex: state.boardStateIndex + 1 }))
//   }

//   componentDidUpdate() {
//     // if (this.context !== this.oldContext) {
//     //   if (this.context.boardState !== this.oldContext.boardState) {
//     //     // transmit board state
//     //   }
//     //   if (this.context.myUserdata !== this.oldContext.myUserdata) {
//     //     // transmit user data
//     //   }
//     //   this.oldContext = this.context
//     // }
//   }
// }

// export { GameContext, GameContextProvider }
