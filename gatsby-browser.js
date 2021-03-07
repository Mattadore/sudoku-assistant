import './src/global.css'
import 'semantic-ui-css/semantic.min.css'
import BoardProvider from './src/components/BoardProvider'
import NetworkProvider from './src/components/NetworkProvider'
import SettingsProvider from './src/components/SettingsProvider'

import React from 'react'

export const wrapRootElement = ({ element }) => {
  return (
    <SettingsProvider>
      <BoardProvider>
        <NetworkProvider>{element}</NetworkProvider>
      </BoardProvider>
    </SettingsProvider>
  )
}
