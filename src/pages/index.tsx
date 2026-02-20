import { Box } from '@mui/material'
import { GameProvider } from '../providers/GameProvider'
import { NetworkProvider } from '../providers/NetworkProvider'
import { ExtensionProvider } from '../providers/ExtensionProvider'
import { Board } from '../components/Board'
import { Sidebar } from '../components/Sidebar'

const Page = () => (
  <GameProvider>
    <NetworkProvider>
      <ExtensionProvider>
        <Box
          css={{
            width: '100%',
            height: '100vh',
            display: 'flex',
            overflow: 'hidden',
          }}
        >
          <style>{`
            html, body {
              width: 100%;
              height: 100%;
              margin: 0;
              padding: 0;
              overflow: hidden;
              background-color: #ddddff;
            }
          `}</style>
          <Sidebar />
          <Board />
        </Box>
      </ExtensionProvider>
    </NetworkProvider>
  </GameProvider>
)

export default Page
