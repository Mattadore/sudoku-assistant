import * as React from 'react'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import { Button } from '@mui/material'

export default function Index() {
  return (
    <Typography variant="h4" component="h1" gutterBottom>
      hello
      <Container maxWidth="xl">
        hello
        <Box sx={{ my: 4 }}>
          hello
          <Typography variant="h4" component="h1" gutterBottom>
            hello Material UI Gatsby example
          </Typography>
        </Box>
        <Button variant="contained">hello</Button>
      </Container>
    </Typography>
  )
}
