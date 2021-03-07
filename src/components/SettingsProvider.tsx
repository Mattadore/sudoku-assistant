import React, {
  useContext,
  createContext,
  useState,
  useRef,
  useMemo,
} from 'react'

interface SettingsData {
  myColor: string
  setMyColor: (color: string) => void
}

const defaults: SettingsData = {
  myColor: 'color' in localStorage ? localStorage.color : '#ffcc00',
  setMyColor: (color: string) => {},
}

const SettingsContext = createContext<SettingsData>(defaults)

export const useSettings = () => useContext(SettingsContext)

const SettingsProvider: React.FC<{}> = ({ children }) => {
  const [myColor, setMyColor] = useState(defaults.myColor)

  const providerValue = useMemo<SettingsData>(
    () => ({
      myColor,
      setMyColor,
    }),
    [myColor],
  )

  return (
    <SettingsContext.Provider value={providerValue}>
      {children}
    </SettingsContext.Provider>
  )
}

export default SettingsProvider
