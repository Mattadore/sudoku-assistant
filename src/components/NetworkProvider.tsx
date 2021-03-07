import React, { useContext, createContext, useState, useRef } from 'react'

interface NetworkData {
  myColor: string
}

const NetworkContext = createContext({})

export const useNetwork = () => useContext(NetworkContext)

const NetworkProvider: React.FC<{}> = ({ children }) => {
  return (
    <NetworkContext.Provider value={{}}>{children}</NetworkContext.Provider>
  )
}

export default NetworkProvider
