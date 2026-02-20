import * as React from 'react'
import { styled } from '@mui/material/styles'
import {
  Accordion,
  AccordionProps,
  AccordionSummary,
  AccordionSummaryProps,
  AccordionDetails,
  TextareaAutosize,
  Box,
  Button,
  Chip,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Popover,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  ArrowForwardIosSharp,
  ChevronLeft,
  ChevronRight,
  ContentCopy,
} from '@mui/icons-material'
import { useGameStore } from '../stores/gameStore'
import { useNetworkStore } from '../stores/networkStore'
import { useExtensionStore } from '../stores/extensionStore'
import { extensionColor } from 'helper'
import { useUIStore } from '../stores/uiStore'
import { importPuzzle } from '../puzzle/import'
import { SolverSection } from '../solver/SolverSection'

const SIDEBAR_WIDTH = 350

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

const SubSection = styled((props: AccordionProps) => (
  <Accordion disableGutters elevation={0} square {...props} />
))(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: '4px !important',
  '&:before': { display: 'none' },
}))

const SubSectionHeader = styled((props: AccordionSummaryProps) => (
  <AccordionSummary
    expandIcon={<ArrowForwardIosSharp sx={{ fontSize: '0.75rem' }} />}
    {...props}
  />
))(({ theme }) => ({
  backgroundColor: 'rgba(0, 0, 0, .02)',
  flexDirection: 'row-reverse',
  minHeight: 32,
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
  const handleFileInput = useNetworkStore((s) => s.handleFileInput)

  const handleImport = () => {
    setImportError(null)
    setImportSuccess(null)
    setImportRuleset(null)
    try {
      const puzzle = importPuzzle(importText.trim())
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
          placeholder="Paste f-puzzles URL/base64 or SudokuPad URL (sudokupad.app/ctc…)"
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
        <Button
          variant="outlined"
          component="label"
          size="small"
          fullWidth
          sx={{ mt: 1.5 }}
        >
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
          {onlineId && (
            <IconButton
              size="small"
              onClick={() => navigator.clipboard.writeText(onlineId)}
              title="Copy invite code"
              sx={{ ml: 'auto', opacity: 0.7 }}
            >
              <ContentCopy sx={{ fontSize: 14 }} />
            </IconButton>
          )}
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

// --- Extensions Content (rendered as a subsection inside Settings) ---
const ExtensionsContent: React.FC = () => {
  const extensions = useExtensionStore((s) => s.extensions)
  const disabledExtensions = useUIStore((s) => s.disabledExtensions)
  const toggleExtensionEnabled = useUIStore((s) => s.toggleExtensionEnabled)

  const extList = Object.values(extensions)

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

  if (extList.length === 0) {
    return (
      <Typography variant="caption" color="text.disabled" sx={{ px: 0.5 }}>
        No active extensions
      </Typography>
    )
  }

  return (
    <>
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
    </>
  )
}

// --- Settings Section ---
const CURSOR_COLOR_PALETTE = [
  // Grays
  '#F5F5F5',
  '#BDBDBD',
  '#9E9E9E',
  '#757575',
  '#424242',
  '#212121',
  // Reds / Pinks
  '#FFCDD2',
  '#EF9A9A',
  '#E57373',
  '#F44336',
  '#C62828',
  '#E91E63',
  // Oranges / Yellows
  '#FFE0B2',
  '#FFCC80',
  '#FFA726',
  '#FF9800',
  '#FF6F00',
  '#FFF176',
  // Greens
  '#F1F8E9',
  '#C5E1A5',
  '#81C784',
  '#4CAF50',
  '#2E7D32',
  '#1B5E20',
  // Teals / Cyans
  '#E0F7FA',
  '#80DEEA',
  '#26C6DA',
  '#00BCD4',
  '#00838F',
  '#006064',
  // Blues
  '#E3F2FD',
  '#90CAF9',
  '#42A5F5',
  '#1E88E5',
  '#1565C0',
  '#0D47A1',
  // Purples
  '#F3E5F5',
  '#CE93D8',
  '#AB47BC',
  '#8E24AA',
  '#6A1B9A',
  '#4A148C',
  // Browns / Misc
  '#EFEBE9',
  '#BCAAA4',
  '#8D6E63',
  '#6D4C41',
  '#4E342E',
  '#795548',
]

const SettingsSection: React.FC = () => {
  const myColor = useNetworkStore((s) => s.myUserdata.color)
  const updateUserdata = useNetworkStore((s) => s.updateUserdata)
  const conflictsEnabled = useUIStore((s) => s.conflictsEnabled)
  const setConflictsEnabled = useUIStore((s) => s.setConflictsEnabled)
  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(null)

  const handleConflictsToggle = (_: React.ChangeEvent<HTMLInputElement>, enabled: boolean) => {
    setConflictsEnabled(enabled)
    if (!enabled) {
      useExtensionStore.getState().clearAllConflicts()
    } else {
      const boardState = useGameStore.getState().gameState.boardState
      const allIndices: string[] = []
      for (let r = 0; r < boardState.length; r++)
        for (let c = 0; c < boardState[0].length; c++)
          allIndices.push(`${r},${c}`)
      setTimeout(() => useExtensionStore.getState().updateConflicts(boardState, allIndices), 0)
    }
  }

  const handleSwatchClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(e.currentTarget)
  }
  const handleClose = () => setAnchorEl(null)
  const handleColorPick = (hex: string) => {
    updateUserdata({ color: hex })
    localStorage.color = hex
    handleClose()
  }

  const open = Boolean(anchorEl)

  return (
    <Section>
      <SectionHeader>
        <Typography variant="subtitle2">Settings</Typography>
      </SectionHeader>
      <AccordionDetails sx={{ pt: 1.5, pb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="body2" sx={{ flex: 1 }}>
            My cursor color
          </Typography>
          <Tooltip title="Change cursor color">
            <Box
              component="button"
              onClick={handleSwatchClick}
              sx={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: myColor,
                border: '2px solid rgba(0,0,0,0.2)',
                cursor: 'pointer',
                flexShrink: 0,
                '&:hover': { opacity: 0.8 },
              }}
            />
          </Tooltip>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1 }}>
          <Typography variant="body2" sx={{ flex: 1 }}>
            Conflict highlighting
          </Typography>
          <Switch
            size="small"
            checked={conflictsEnabled}
            onChange={handleConflictsToggle}
          />
        </Box>
        <Popover
          open={open}
          anchorEl={anchorEl}
          onClose={handleClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Box sx={{ p: 1.5 }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(6, 1fr)',
                gap: '6px',
              }}
            >
              {CURSOR_COLOR_PALETTE.map((hex) => (
                <Box
                  key={hex}
                  component="button"
                  onClick={() => handleColorPick(hex)}
                  sx={{
                    width: 26,
                    height: 26,
                    borderRadius: '4px',
                    background: hex,
                    border:
                      myColor === hex
                        ? '2px solid #333'
                        : '1.5px solid rgba(0,0,0,0.15)',
                    cursor: 'pointer',
                    outline: myColor === hex ? '2px solid #fff' : 'none',
                    outlineOffset: '-4px',
                    '&:hover': { transform: 'scale(1.15)', zIndex: 1 },
                    transition: 'transform 0.1s',
                    position: 'relative',
                  }}
                />
              ))}
            </Box>
          </Box>
        </Popover>
        <SubSection sx={{ mt: 1.5 }}>
          <SubSectionHeader>
            <Typography variant="body2">Extensions</Typography>
          </SubSectionHeader>
          <AccordionDetails sx={{ pt: 0.5, pb: 1, px: 1 }}>
            <ExtensionsContent />
          </AccordionDetails>
        </SubSection>
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
          left: visible ? SIDEBAR_WIDTH + 4 : 4,
          zIndex: 1300,
          transition: 'left 0.25s ease',
          bgcolor: 'background.paper',
          boxShadow: 1,
          '&:hover': { bgcolor: 'grey.200' },
        }}
        size="small"
      >
        {visible ? <ChevronLeft /> : <ChevronRight />}
      </IconButton>
      <Drawer
        sx={{
          width: 0,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: SIDEBAR_WIDTH,
            boxSizing: 'border-box',
            transform: visible ? 'none' : `translateX(-${SIDEBAR_WIDTH}px)`,
            transition: 'transform 0.25s ease',
            overflow: 'hidden auto',
          },
        }}
        variant="permanent"
        anchor="left"
      >
        <ImportSection />
        <MultiplayerSection />
        <SettingsSection />
        <Section>
          <SectionHeader>
            <Typography variant="subtitle2">Solver</Typography>
          </SectionHeader>
          <AccordionDetails sx={{ p: 0 }}>
            <SolverSection />
          </AccordionDetails>
        </Section>
        <NotesSection />
      </Drawer>
    </>
  )
}
