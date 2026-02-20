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
  IconButton,
  List,
  ListItem,
  ListItemText,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import {
  ArrowForwardIosSharp,
  ChevronLeft,
  ChevronRight,
} from '@mui/icons-material'
import { useGameStore, type GameState } from '../stores/gameStore'
import { useNetworkStore } from '../stores/networkStore'
import { useExtensionStore } from '../stores/extensionStore'
import { splitIndex, extensionColor } from 'helper'
import { useUIStore } from '../stores/uiStore'
import { importFPuzzle } from '../puzzle/import'

const SIDEBAR_WIDTH = 350

const colorPickerColors = [
  '#ffffff',
  '#b5b5b5',
  '#DBDF00',
  '#A4DD00',
  '#68CCCA',
  '#73D8FF',
  '#AEA1FF',
  '#FDA1FF',
  '#f55f73',
  '#d8e6f7',
  '#fce4cf',
  '#333333',
  '#808080',
  '#FCC400',
  '#B0BC00',
  '#000000',
  '#ef9173',
  '#ff0000',
  '#ff4d00',
  '#FB9E00',
  '#68BC00',
  '#00fb1d',
  '#30C18A',
  '#16A5A5',
  '#009CE0',
  '#6144E5',
  '#7B64FF',
  '#AB149E',
  '#FA28FF',
  '#E91E63',
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
  const [importRuleset, setImportRuleset] = React.useState<string | null>(null)

  const handleImport = () => {
    setImportError(null)
    setImportSuccess(null)
    setImportRuleset(null)
    try {
      const puzzle = importFPuzzle(importText.trim())
      setImportSuccess(
        puzzle.metadata.title
          ? `Loaded "${puzzle.metadata.title}"`
          : 'Puzzle loaded',
      )
      if (puzzle.metadata.ruleset) setImportRuleset(puzzle.metadata.ruleset)
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
          sx={{
            '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: 12 },
          }}
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
          <Typography
            color="error"
            variant="caption"
            sx={{ mt: 0.5, display: 'block' }}
          >
            {importError}
          </Typography>
        )}
        {importSuccess && (
          <Typography
            color="success.main"
            variant="caption"
            sx={{ mt: 0.5, display: 'block' }}
          >
            {importSuccess}
          </Typography>
        )}
        {importRuleset && (
          <Typography
            variant="caption"
            sx={{
              mt: 0.5,
              display: 'block',
              whiteSpace: 'pre-wrap',
              color: 'text.secondary',
              fontSize: 11,
            }}
          >
            {importRuleset}
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
  const pickingMe = useNetworkStore((s) => s.pickingMe)
  const setPickingMe = useNetworkStore((s) => s.setPickingMe)
  const selectedColor = useNetworkStore((s) => s.selectedColor)
  const setSelectedColor = useNetworkStore((s) => s.setSelectedColor)
  const networkDispatch = useNetworkStore((s) => s.networkDispatch)

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
              networkDispatch((draft: GameState) => {
                for (const selected of selectedIndices) {
                  const [row, column] = splitIndex(selected)
                  const cell = draft.boardState[row][column]
                  const idx = cell.color.indexOf(color.hex)
                  if (idx >= 0) {
                    cell.color.splice(idx, 1)
                  } else {
                    cell.color.push(color.hex)
                  }
                }
              })
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

  const connectionStatus =
    clients.size > 0 ? 'HOST' : host != null ? 'CLIENT' : 'OFFLINE'

  const statusColor =
    connectionStatus === 'OFFLINE'
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
  const disabledExtensions = useUIStore((s) => s.disabledExtensions)
  const toggleExtensionEnabled = useUIStore((s) => s.toggleExtensionEnabled)

  const extList = Object.values(extensions)
  if (extList.length === 0) return null

  const handleToggle = (name: string) => {
    toggleExtensionEnabled(name)
    // Recompute conflicts for all cells after toggling
    const boardState = useGameStore.getState().gameState.boardState
    const allIndices: string[] = []
    for (let r = 0; r < boardState.length; r++) {
      for (let c = 0; c < boardState[0].length; c++) {
        allIndices.push(`${r},${c}`)
      }
    }
    // Use setTimeout so the uiStore update is committed first
    setTimeout(() => {
      useExtensionStore.getState().updateConflicts(boardState, allIndices)
    }, 0)
  }

  return (
    <Section>
      <SectionHeader>
        <Typography variant="subtitle2">Extensions</Typography>
      </SectionHeader>
      <AccordionDetails sx={{ pt: 0, pb: 1 }}>
        <List dense disablePadding>
          {extList.map((ext) => {
            const disabled = disabledExtensions.has(ext.extensionName)
            const color = extensionColor(ext.extensionName)
            return (
              <ListItem key={ext.extensionName} disableGutters sx={{ py: 0 }}>
                <ListItemText
                  primary={ext.extensionName}
                  primaryTypographyProps={{
                    variant: 'body2',
                    sx: {
                      color: disabled ? 'text.disabled' : color,
                      fontWeight: 500,
                      textTransform: 'capitalize',
                    },
                  }}
                />
                <Switch
                  edge="end"
                  size="small"
                  checked={!disabled}
                  onChange={() => handleToggle(ext.extensionName)}
                />
              </ListItem>
            )
          })}
        </List>
        {extList
          .filter(
            (ext) =>
              ext.getSidebarControls &&
              !disabledExtensions.has(ext.extensionName),
          )
          .map((ext) => (
            <React.Fragment key={ext.extensionName}>
              {ext.getSidebarControls!()}
            </React.Fragment>
          ))}
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
export const Sidebar: React.FC = () => {
  const visible = useUIStore((s) => s.sidebarVisible)
  const toggle = useUIStore((s) => s.toggleSidebar)

  return (
    <>
      <IconButton
        onClick={toggle}
        sx={{
          position: 'fixed',
          top: 8,
          right: visible ? SIDEBAR_WIDTH + 4 : 4,
          zIndex: 1300,
          transition: 'right 0.25s ease',
          bgcolor: 'background.paper',
          boxShadow: 1,
          '&:hover': { bgcolor: 'grey.200' },
        }}
        size="small"
      >
        {visible ? <ChevronRight /> : <ChevronLeft />}
      </IconButton>
      <Drawer
        sx={{
          width: visible ? SIDEBAR_WIDTH : 0,
          flexShrink: 0,
          transition: 'width 0.25s ease',
          '& .MuiDrawer-paper': {
            width: SIDEBAR_WIDTH,
            boxSizing: 'border-box',
            transform: visible ? 'none' : `translateX(${SIDEBAR_WIDTH}px)`,
            transition: 'transform 0.25s ease',
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
    </>
  )
}
