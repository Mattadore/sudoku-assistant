// import * as React from 'react'
// import '../helper'
// import { haveSameMembers } from '../helper'
// import { GameContextProvider } from './GameContext'

// type DataContextUpdaters = {
//   addBoardState: (state: BoardState) => void
//   resetBoardState: (state: BoardState) => void
//   setBoardStateIndex: (index: number) => void
// }

// type DataContextProps = {
//   numRows: 9
//   numColumns: 9
// }

// type DataContextState = {
//   boardStateIndex: number
//   boardState: BoardState
//   dimensions: [number, number]
//   myUserdata: Userdata
// }

// const DataContext = React.createContext<DataContextState>({} as any)

// class DataContextProvider extends React.Component<
//   React.PropsWithChildren<DataContextProps>,
//   DataContextState
// > {
//   boardStates: BoardState[] = [[]]

//   constructor(props: DataContextProps) {
//     super(props)
//     this.state = {
//       boardStateIndex: 0,
//       boardState: {} as any,
//       dimensions: [props.numRows, props.numColumns],
//       myUserdata: {}, // todo, load userdata
//     }
//   }

//   addBoardState = (newBoardState: BoardState) => {
//     this.boardStates.splice(
//       this.state.boardStateIndex + 1,
//       this.boardStates.length,
//     )
//     this.boardStates.push(newBoardState)
//     this.setState((state) => ({
//       boardStateIndex: state.boardStateIndex + 1,
//     }))
//   }

//   resetBoardState = (newBoardState: BoardState) => {
//     this.boardStates = [newBoardState]
//     this.setState({ boardStateIndex: 1 })
//   }

//   setBoardStateIndex = (index: number) => {
//     this.setState({
//       boardStateIndex: index,
//       boardState: this.boardStates[index],
//     })
//   }

//   dataUpdateMethods = {
//     addBoardState: this.addBoardState,
//     resetBoardState: this.resetBoardState,
//     setBoardStateIndex: this.setBoardStateIndex,
//   }

//   render = () => {
//     return (
//       <DataContext.Provider value={this.state}>
//         <GameContextProvider dataUpdateMethods={this.dataUpdateMethods}>
//           {this.props.children}
//         </GameContextProvider>
//       </DataContext.Provider>
//     )
//   }
// }
// export { DataContext, DataContextProvider, DataContextUpdaters }
