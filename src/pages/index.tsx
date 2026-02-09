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
        <Box css={{ width: '100%', height: '100vh' }}>
          <style>{`
            html {
              width: 100%;
              height: 100%;
              background-color: #ddddff;
            }
            body {
              margin: 0px;
              padding: 0px;
            }
          `}</style>
          <Board />
          <Sidebar />
        </Box>
      </ExtensionProvider>
    </NetworkProvider>
  </GameProvider>
)

export default Page
