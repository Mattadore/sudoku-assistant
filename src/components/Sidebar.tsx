import * as React from 'react'
import { CompactPicker } from 'react-color'
import { styled } from '@mui/material/styles'
import {
  Accordion,
  AccordionProps,
  AccordionSummary,
  AccordionSummaryProps,
  AccordionDetails,
  TextareaAutosize,
  Button,
  Chip,
  Drawer,
  TextField,
  Typography,
} from '@mui/material'
import { ArrowForwardIosSharp } from '@mui/icons-material'
import { useGameStore, GameState } from '../stores/gameStore'
import { useNetworkStore } from '../stores/networkStore'
import { useExtensionStore } from '../stores/extensionStore'
import { splitIndex } from 'helper'
import { importFPuzzle } from '../puzzle/import'

const SIDEBAR_WIDTH = 350

const colorPickerColors = [
  '#ffffff', '#b5b5b5', '#FCDC00', '#DBDF00', '#A4DD00',
  '#68CCCA', '#73D8FF', '#AEA1FF', '#FDA1FF', '#f55f73',
  '#d8e6f7', '#fce4cf',
  '#333333', '#808080', '#FCC400', '#B0BC00', '#68BC00',
  '#16A5A5', '#009CE0', '#7B64FF', '#FA28FF',
  '#000000', '#ef9173', '#ff0000', '#ff4d00', '#FB9E00',
  '#68BC00', '#00fb1d', '#30C18A', '#16A5A5', '#009CE0',
  '#7B64FF', '#AB149E',
]

// Styled accordion components
const Section = styled((props: AccordionProps) => (
  <Accordion disableGutters elevation={0} square {...props} />
))(({ theme }) => ({
  borderBottom: `1px solid ${theme.palette.divider}`,
  '&:not(:last-child)': { borderBottom: 0 },
  '&:before': { display: 'none' },
}))

const SectionHeader = styled((props: AccordionSummaryProps) => (
  <AccordionSummary
    expandIcon={<ArrowForwardIosSharp sx={{ fontSize: '0.9rem' }} />}
    {...props}
  />
))(({ theme }) => ({
  borderTop: `1px solid ${theme.palette.divider}`,
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: 'rgba(0, 0, 0, .04)',
  flexDirection: 'row-reverse',
  minHeight: 40,
  '& .MuiAccordionSummary-expandIconWrapper.Mui-expanded': {
    transform: 'rotate(90deg)',
  },
  '& .MuiAccordionSummary-content': {
    marginLeft: theme.spacing(1),
  },
}))

// --- Import Section ---
const ImportSection: React.FC = () => {
  const [importText, setImportText] = React.useState('')
  const [importError, setImportError] = React.useState<string | null>(null)
  const [importSuccess, setImportSuccess] = React.useState<string | null>(null)

  const handleImport = () => {
    setImportError(null)
    setImportSuccess(null)
    try {
      const puzzle = importFPuzzle(importText.trim())
      setImportSuccess(
        puzzle.metadata.title
          ? `Loaded "${puzzle.metadata.title}"`
          : 'Puzzle loaded',
      )
      setImportText('')
    } catch (e: any) {
      setImportError(e.message || 'Failed to import puzzle')
    }
  }

  return (
    <Section defaultExpanded>
      <SectionHeader>
        <Typography variant="subtitle2">Import Puzzle</Typography>
      </SectionHeader>
      <AccordionDetails sx={{ pt: 1.5, pb: 1.5 }}>
        <TextField
          multiline
          minRows={2}
          maxRows={4}
          fullWidth
          size="small"
          placeholder="Paste f-puzzles URL or base64..."
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: 12 } }}
        />
        <Button
          variant="contained"
          size="small"
          fullWidth
          sx={{ mt: 1 }}
          onClick={handleImport}
          disabled={!importText.trim()}
        >
          Import
        </Button>
        {importError && (
          <Typography color="error" variant="caption" sx={{ mt: 0.5, display: 'block' }}>
            {importError}
          </Typography>
        )}
        {importSuccess && (
          <Typography color="success.main" variant="caption" sx={{ mt: 0.5, display: 'block' }}>
            {importSuccess}
          </Typography>
        )}
      </AccordionDetails>
    </Section>
  )
}

// --- Color Section ---
const ColorSection: React.FC = () => {
  const myColor = useNetworkStore((s) => s.myUserdata.color)
  const selectedIndices = useNetworkStore((s) => s.myUserdata.selectedIndices)
  const updateUserdata = useNetworkStore((s) => s.updateUserdata)
  const onlineId = useNetworkStore((s) => s.onlineId)
  const pickingMe = useNetworkStore((s) => s.pickingMe)
  const setPickingMe = useNetworkStore((s) => s.setPickingMe)
  const selectedColor = useNetworkStore((s) => s.selectedColor)
  const setSelectedColor = useNetworkStore((s) => s.setSelectedColor)
  const dispatch = useGameStore((s) => s.dispatch)

  return (
    <Section>
      <SectionHeader>
        <Typography variant="subtitle2">Color</Typography>
      </SectionHeader>
      <AccordionDetails sx={{ pt: 1.5, pb: 1.5 }}>
        <CompactPicker
          colors={colorPickerColors}
          color={pickingMe ? myColor : selectedColor}
          onChangeComplete={(color) => {
            if (pickingMe) {
              setPickingMe(false)
              updateUserdata({ color: color.hex })
              localStorage.color = color.hex
            } else {
              setSelectedColor(color.hex)
              dispatch((draft: GameState) => {
                for (const selected of selectedIndices) {
                  const [row, column] = splitIndex(selected)
                  draft.boardState[row][column].color = color.hex
                }
              }, onlineId)
            }
          }}
        />
        <Button
          size="small"
          variant="outlined"
          fullWidth
          sx={{
            mt: 1,
            borderColor: myColor,
            color: myColor,
            '&:hover': { borderColor: myColor, opacity: 0.8 },
          }}
          onClick={() => setPickingMe(!pickingMe)}
        >
          {pickingMe ? 'Picking my color...' : 'Pick my color'}
        </Button>
      </AccordionDetails>
    </Section>
  )
}

// --- File Section ---
const FileSection: React.FC = () => {
  const handleFileInput = useNetworkStore((s) => s.handleFileInput)

  return (
    <Section>
      <SectionHeader>
        <Typography variant="subtitle2">Image Overlay</Typography>
      </SectionHeader>
      <AccordionDetails sx={{ pt: 1.5, pb: 1.5 }}>
        <Button variant="outlined" component="label" size="small" fullWidth>
          Upload Image
          <input
            type="file"
            hidden
            accept="image/*"
            onChange={(event) => {
              if (event.target.files?.length) {
                handleFileInput(event.target.files[0])
              }
            }}
          />
        </Button>
      </AccordionDetails>
    </Section>
  )
}

// --- Multiplayer Section ---
const MultiplayerSection: React.FC = () => {
  const onlineId = useNetworkStore((s) => s.onlineId)
  const host = useNetworkStore((s) => s.host)
  const clients = useNetworkStore((s) => s.clients)
  const hostIdText = useNetworkStore((s) => s.hostIdText)
  const setHostIdText = useNetworkStore((s) => s.setHostIdText)
  const joinGame = useNetworkStore((s) => s.joinGame)

  const connectionStatus = clients.size > 0
    ? 'HOST'
    : host != null
    ? 'CLIENT'
    : 'OFFLINE'

  const statusColor = connectionStatus === 'OFFLINE'
    ? 'default'
    : connectionStatus === 'HOST'
    ? 'primary'
    : 'secondary'

  return (
    <Section>
      <SectionHeader>
        <Typography variant="subtitle2">Multiplayer</Typography>
      </SectionHeader>
      <AccordionDetails sx={{ pt: 1.5, pb: 1.5 }}>
        <Typography
          variant="caption"
          sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}
        >
          <Chip label={connectionStatus} size="small" color={statusColor} />
          <span style={{ fontFamily: 'monospace', fontSize: 11, opacity: 0.7 }}>
            {onlineId}
          </span>
        </Typography>
        <TextField
          size="small"
          fullWidth
          placeholder="Enter host ID to join..."
          value={hostIdText}
          onChange={(e) => setHostIdText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') joinGame(hostIdText)
          }}
          sx={{ mb: 1 }}
        />
        <Button
          variant="outlined"
          size="small"
          fullWidth
          onClick={() => joinGame(hostIdText)}
          disabled={!hostIdText.trim()}
        >
          Join Game
        </Button>
        {host && (
          <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
            Connected to host
          </Typography>
        )}
        {clients.size > 0 && (
          <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
            Clients: {Array.from(clients, ([name]) => name).join(', ')}
          </Typography>
        )}
      </AccordionDetails>
    </Section>
  )
}

// --- Extensions Section ---
const ExtensionsSection: React.FC = () => {
  const extensions = useExtensionStore((s) => s.extensions)
  const controls = Object.values(extensions)
    .filter((ext) => ext.getSidebarControls)
    .map((ext) => (
      <React.Fragment key={ext.extensionName}>
        {ext.getSidebarControls!()}
      </React.Fragment>
    ))

  if (controls.length === 0) return null

  return (
    <Section>
      <SectionHeader>
        <Typography variant="subtitle2">Extensions</Typography>
      </SectionHeader>
      <AccordionDetails sx={{ pt: 1.5, pb: 1.5 }}>
        {controls}
      </AccordionDetails>
    </Section>
  )
}

// --- Notes Section ---
const NotesSection: React.FC = () => {
  const [notes, setNotes] = React.useState('')

  return (
    <Section>
      <SectionHeader>
        <Typography variant="subtitle2">Notes</Typography>
      </SectionHeader>
      <AccordionDetails sx={{ pt: 1.5, pb: 1.5 }}>
        <TextareaAutosize
          minRows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Scratch pad..."
          style={{
            width: '100%',
            fontFamily: 'inherit',
            fontSize: 13,
            padding: 8,
            borderRadius: 4,
            border: '1px solid #ccc',
            resize: 'vertical',
          }}
        />
      </AccordionDetails>
    </Section>
  )
}

// --- Main Sidebar ---
export const Sidebar: React.FC = () => (
  <Drawer
    sx={{
      width: SIDEBAR_WIDTH,
      flexShrink: 0,
      '& .MuiDrawer-paper': {
        width: SIDEBAR_WIDTH,
        boxSizing: 'border-box',
      },
    }}
    variant="permanent"
    anchor="right"
  >
    <ImportSection />
    <ColorSection />
    <FileSection />
    <MultiplayerSection />
    <ExtensionsSection />
    <NotesSection />
  </Drawer>
)
