import './src/global.css'
import * as React from 'react'
// import 'semantic-ui-css/semantic.min.css'

// const React = require('react')
// const Mui = require('@mui/material')

import { StyledEngineProvider } from '@mui/material/styles'

export const wrapPageElement = ({ element, props }) => {
  return (
    <React.StrictMode>
      <StyledEngineProvider injectFirst>{element}</StyledEngineProvider>
    </React.StrictMode>
  )
}
