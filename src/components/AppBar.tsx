import React from 'react'

import {
  List,
  Drawer,
  ListItem,
  TextareaAutosize,
  Accordion,
  Typography,
  AccordionSummary,
  AccordionDetails,
  AppBar,
  Toolbar,
  Button,
  IconButton,
} from '@material-ui/core'
import { ExpandMore, Menu as MenuIcon } from '@material-ui/icons'
import {
  Theme,
  makeStyles,
  createStyles,
  withStyles,
} from '@material-ui/core/styles'

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      flexGrow: 1,
    },
    menuButton: {
      marginRight: theme.spacing(2),
    },
    title: {
      flexGrow: 1,
    },
  }),
)

export default function SudokuAppBar() {
  const classes = useStyles()

  return (
    <div className={classes.root}>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            edge="start"
            className={classes.menuButton}
            color="inherit"
            aria-label="menu"
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" className={classes.title}>
            News
          </Typography>
          <Button color="inherit">Login</Button>
        </Toolbar>
      </AppBar>
    </div>
  )
}
