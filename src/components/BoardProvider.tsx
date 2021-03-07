import React, { useContext, createContext, useState, useRef } from 'react'

const BoardContext = createContext({})

export const useBoard = () => useContext(BoardContext)

const BoardProvider: React.FC<{}> = ({ children }) => {
  const board = useRef({})
  return <BoardContext.Provider value={{}}>{children}</BoardContext.Provider>
}

export default BoardProvider
