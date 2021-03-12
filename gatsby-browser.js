import './src/global.css'
import 'semantic-ui-css/semantic.min.css'
import React from 'react'
// const React = require('react')
// const Layout = require('./src/components/layout').default

// exports.wrapPageElement = ({ element, props }) => {
//   // props provide same data to Layout as Page element will get
//   // including location, data, etc - you don't need to pass it
//   return <Layout {...props}>{element}</Layout>
// }
import {
  createMuiTheme,
  createStyles,
  ThemeProvider,
  withStyles,
  WithStyles,
} from '@material-ui/core/styles'
// import moop from "components/GridCell"
// import GreedCell from ""
// import cute from ""

let theme = createMuiTheme({
  palette: {
    // type: 'dark',
    primary: {
      light: '#63ccff',
      main: '#009be5',
      dark: '#006db3',
    },
  },
  typography: {
    h5: {
      fontWeight: 500,
      fontSize: 26,
      letterSpacing: 0.5,
    },
  },
  //   shape: {
  //     borderRadius: 8,
  //   },
  props: {
    MuiTab: {
      disableRipple: true,
    },
  },
  mixins: {
    toolbar: {
      minHeight: 48,
    },
  },
})

export const wrapRootElement = ({ element }) => (
  <ThemeProvider theme={theme}>{element}</ThemeProvider>
)
