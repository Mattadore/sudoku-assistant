import * as React from 'react'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  LinearProgress,
  Slider,
  Switch,
  Typography,
} from '@mui/material'
import { PlayArrow, Stop, CheckCircle, Error as ErrorIcon } from '@mui/icons-material'
import { useGameStore } from '../stores/gameStore'
import { useExtensionStore } from '../stores/extensionStore'
import { useUIStore } from '../stores/uiStore'
import type { SolverJob, WorkerInMessage, WorkerOutMessage } from './solverTypes'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type SolverStatus = 'idle' | 'running' | 'done'

type SolverResult = {
  solutions: number[][]
  nodesExplored: number
  elapsedMs: number
  allJobsDone: boolean
}

// ---------------------------------------------------------------------------
// Constraint extraction helper
// ---------------------------------------------------------------------------
function extractConstraints(rows: number, cols: number): SolverConstraint[] {
  const extensions = useExtensionStore.getState().extensions
  const disabledExtensions = useUIStore.getState().disabledExtensions
  const all: SolverConstraint[] = []
  for (const ext of Object.values(extensions)) {
    if (disabledExtensions.has(ext.extensionName)) continue
    if (ext.serializeConstraints) {
      all.push(...ext.serializeConstraints(rows, cols))
    }
  }
  return all
}

function extractBoard(rows: number, cols: number): number[] {
  const board = useGameStore.getState().gameState.boardState
  const flat: number[] = new Array(rows * cols).fill(0)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      flat[r * cols + c] = board[r]?.[c]?.number ?? 0
    }
  }
  return flat
}

// ---------------------------------------------------------------------------
// Job queue builder — splits on the first unforced empty cell (up to 9 jobs)
// ---------------------------------------------------------------------------
function buildJobs(
  board: number[],
  rows: number,
  cols: number,
  constraints: SolverConstraint[],
): SolverJob[] {
  const maxDigit = Math.max(rows, cols)

  // Find first empty cell
  let branchCell = -1
  for (let i = 0; i < board.length; i++) {
    if (board[i] === 0) { branchCell = i; break }
  }

  if (branchCell === -1) {
    // Board already fully filled — create a single job to validate
    return [{ jobId: 'j0', board: board.slice(), rows, cols, maxDigit, constraints }]
  }

  const jobs: SolverJob[] = []
  for (let d = 1; d <= maxDigit; d++) {
    const b = board.slice()
    b[branchCell] = d
    jobs.push({
      jobId: `j${d}`,
      board: b,
      rows,
      cols,
      maxDigit,
      constraints,
    })
  }
  return jobs
}

// ---------------------------------------------------------------------------
// Worker pool manager (hook)
// ---------------------------------------------------------------------------
function useSolverWorkerPool(threadCount: number) {
  const workersRef = React.useRef<Worker[]>([])

  const spawnWorkers = React.useCallback(() => {
    // Terminate any existing workers
    for (const w of workersRef.current) w.terminate()
    workersRef.current = []
    for (let i = 0; i < threadCount; i++) {
      const w = new Worker(new URL('./solver.worker.ts', import.meta.url))
      workersRef.current.push(w)
    }
    return workersRef.current
  }, [threadCount])

  const terminateAll = React.useCallback(() => {
    for (const w of workersRef.current) w.terminate()
    workersRef.current = []
  }, [])

  React.useEffect(() => () => terminateAll(), [terminateAll])

  return { spawnWorkers, terminateAll }
}

// ---------------------------------------------------------------------------
// Board display helper (small 9x9 grid of digits)
// ---------------------------------------------------------------------------
const SolutionGrid: React.FC<{ board: number[]; rows: number; cols: number }> = React.memo(
  ({ board, rows, cols }) => (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        border: '1.5px solid #666',
        width: 'fit-content',
        mx: 'auto',
      }}
    >
      {board.map((v, i) => (
        <Box
          key={i}
          sx={{
            width: 22,
            height: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 600,
            borderRight: (i % cols) < cols - 1 ? '1px solid #ccc' : 'none',
            borderBottom: Math.floor(i / cols) < rows - 1 ? '1px solid #ccc' : 'none',
            color: v === 0 ? 'transparent' : '#333',
            bgcolor: 'transparent',
          }}
        >
          {v || '·'}
        </Box>
      ))}
    </Box>
  ),
)

// ---------------------------------------------------------------------------
// Main SolverSection component
// ---------------------------------------------------------------------------
export const SolverSection: React.FC = () => {
  const gridConfig = useGameStore((s) => s.gameState.gridConfig)
  const knownSolution = useGameStore((s) => s.knownSolution)

  const [threadCount, setThreadCount] = React.useState(2)
  const [maxThreads, setMaxThreads] = React.useState(4)
  const [checkUniqueness, setCheckUniqueness] = React.useState(false)

  React.useEffect(() => {
    if (navigator.hardwareConcurrency) {
      setMaxThreads(Math.min(navigator.hardwareConcurrency, 8))
    }
  }, [])
  const [status, setStatus] = React.useState<SolverStatus>('idle')
  const [result, setResult] = React.useState<SolverResult | null>(null)

  // Live progress state (updated by workers)
  const [jobsTotal, setJobsTotal] = React.useState(0)
  const [jobsDone, setJobsDone] = React.useState(0)
  const [nodesLive, setNodesLive] = React.useState(0)

  const jobQueueRef = React.useRef<SolverJob[]>([])
  const solutionsRef = React.useRef<number[][]>([])
  const nodesRef = React.useRef(0)
  const startTimeRef = React.useRef(0)
  const jobsDoneRef = React.useRef(0)
  const totalJobsRef = React.useRef(0)
  const stoppedRef = React.useRef(false)

  const { spawnWorkers, terminateAll } = useSolverWorkerPool(threadCount)

  // ---------------------------------------------------------------------------
  // Apply solution to board
  // ---------------------------------------------------------------------------
  const applySolution = React.useCallback((sol: number[]) => {
    const { rows, cols } = useGameStore.getState().gameState.gridConfig
    useGameStore.getState().dispatch((draft) => {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const v = sol[r * cols + c]
          if (!draft.boardState[r][c].fixed && v > 0) {
            draft.boardState[r][c].number = v
          }
        }
      }
    }, 'solver')
  }, [])

  // ---------------------------------------------------------------------------
  // Worker message handler factory
  // ---------------------------------------------------------------------------
  const makeWorkerHandler = React.useCallback(
    (workers: Worker[], stopOnFirst: boolean) =>
      (workerIndex: number) =>
      (e: MessageEvent<WorkerOutMessage>) => {
        if (stoppedRef.current) return
        const msg = e.data

        if (msg.type === 'progress') {
          nodesRef.current += msg.nodes
          setNodesLive(nodesRef.current)
          return
        }

        if (msg.type === 'solution') {
          solutionsRef.current.push(msg.board)
          jobsDoneRef.current++
          setJobsDone(jobsDoneRef.current)

          if (!checkUniqueness || (stopOnFirst && solutionsRef.current.length === 1)) {
            // Stop all workers
            stoppedRef.current = true
            for (const w of workers) w.postMessage({ type: 'stop' } as WorkerInMessage)
            setStatus('done')
            setResult({
              solutions: solutionsRef.current.slice(),
              nodesExplored: nodesRef.current,
              elapsedMs: Date.now() - startTimeRef.current,
              allJobsDone: false,
            })
            return
          }
        }

        if (msg.type === 'no_solution') {
          jobsDoneRef.current++
          setJobsDone(jobsDoneRef.current)
        }

        // Assign next job from queue
        const nextJob = jobQueueRef.current.pop()
        if (nextJob) {
          workers[workerIndex].postMessage({ type: 'solve', job: nextJob } as WorkerInMessage)
        } else if (jobsDoneRef.current >= totalJobsRef.current) {
          // All jobs done
          if (!stoppedRef.current) {
            stoppedRef.current = true
            setStatus('done')
            setResult({
              solutions: solutionsRef.current.slice(),
              nodesExplored: nodesRef.current,
              elapsedMs: Date.now() - startTimeRef.current,
              allJobsDone: true,
            })
          }
        }
      },
    [checkUniqueness],
  )

  // ---------------------------------------------------------------------------
  // Start solver
  // ---------------------------------------------------------------------------
  const handleStart = React.useCallback(() => {
    const { rows, cols } = gridConfig
    const board = extractBoard(rows, cols)
    const constraints = extractConstraints(rows, cols)
    const jobs = buildJobs(board, rows, cols, constraints)

    if (jobs.length === 0) return

    // Reset state
    solutionsRef.current = []
    nodesRef.current = 0
    jobsDoneRef.current = 0
    stoppedRef.current = false
    startTimeRef.current = Date.now()
    totalJobsRef.current = jobs.length
    jobQueueRef.current = jobs.slice().reverse() // pop() takes from end

    setJobsTotal(jobs.length)
    setJobsDone(0)
    setNodesLive(0)
    setResult(null)
    setStatus('running')

    const workers = spawnWorkers()
    const stopOnFirst = !checkUniqueness
    const handler = makeWorkerHandler(workers, stopOnFirst)

    for (let i = 0; i < workers.length; i++) {
      workers[i].onmessage = handler(i) as any
      const job = jobQueueRef.current.pop()
      if (job) {
        workers[i].postMessage({ type: 'solve', job } as WorkerInMessage)
      }
    }
  }, [gridConfig, checkUniqueness, spawnWorkers, makeWorkerHandler])

  // ---------------------------------------------------------------------------
  // Stop solver
  // ---------------------------------------------------------------------------
  const handleStop = React.useCallback(() => {
    stoppedRef.current = true
    terminateAll()
    setStatus('done')
    setResult({
      solutions: solutionsRef.current.slice(),
      nodesExplored: nodesRef.current,
      elapsedMs: Date.now() - startTimeRef.current,
      allJobsDone: false,
    })
  }, [terminateAll])

  const running = status === 'running'
  const progress = jobsTotal > 0 ? (jobsDone / jobsTotal) * 100 : 0

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {/* Known solution banner */}
      {knownSolution && (
        <Box
          sx={{
            p: 1,
            borderRadius: 1,
            bgcolor: 'info.50',
            border: '1px solid',
            borderColor: 'info.200',
          }}
        >
          <Typography variant="caption" sx={{ color: 'info.dark', fontWeight: 600, display: 'block' }}>
            Puzzle includes a built-in solution
          </Typography>
          <SolutionGrid board={knownSolution} rows={gridConfig.rows} cols={gridConfig.cols} />
          <Button
            size="small"
            variant="outlined"
            fullWidth
            sx={{ mt: 1 }}
            onClick={() => applySolution(knownSolution)}
          >
            Apply to board
          </Button>
        </Box>
      )}

      {/* Thread count */}
      <Box>
        <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
          Threads: {threadCount}
        </Typography>
        <Slider
          value={threadCount}
          min={1}
          max={maxThreads}
          step={1}
          marks
          disabled={running}
          onChange={(_, v) => setThreadCount(v as number)}
          size="small"
        />
      </Box>

      {/* Check uniqueness toggle */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Switch
          size="small"
          checked={checkUniqueness}
          disabled={running}
          onChange={(e) => setCheckUniqueness(e.target.checked)}
        />
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Check for unique solution
        </Typography>
      </Box>

      {/* Run / Stop */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant="contained"
          size="small"
          fullWidth
          startIcon={running ? <CircularProgress size={14} color="inherit" /> : <PlayArrow fontSize="small" />}
          onClick={handleStart}
          disabled={running}
        >
          {running ? 'Solving…' : 'Solve'}
        </Button>
        {running && (
          <Button variant="outlined" size="small" color="error" onClick={handleStop} startIcon={<Stop fontSize="small" />}>
            Stop
          </Button>
        )}
      </Box>

      {/* Progress bar */}
      {(running || status === 'done') && jobsTotal > 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Jobs: {jobsDone}/{jobsTotal}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {(nodesLive || result?.nodesExplored || 0).toLocaleString()} nodes
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progress}
            color={status === 'done' ? (result && result.solutions.length > 0 ? 'success' : 'error') : 'primary'}
          />
        </Box>
      )}

      {/* Results */}
      {result && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            {result.solutions.length > 0 ? (
              <CheckCircle fontSize="small" color="success" />
            ) : (
              <ErrorIcon fontSize="small" color="error" />
            )}
            <Typography variant="body2" fontWeight={600}>
              {result.solutions.length === 0
                ? 'No solution found'
                : result.solutions.length === 1
                ? 'Solution found'
                : `${result.solutions.length} solutions found`}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            <Chip
              label={`${(result.elapsedMs / 1000).toFixed(2)}s`}
              size="small"
              variant="outlined"
            />
            {result.allJobsDone && result.solutions.length === 1 && (
              <Chip label="Unique solution confirmed" size="small" color="success" />
            )}
            {result.allJobsDone && result.solutions.length > 1 && (
              <Chip label="Multiple solutions exist" size="small" color="warning" />
            )}
            {result.allJobsDone && result.solutions.length === 0 && (
              <Chip label="No solution exists" size="small" color="error" />
            )}
          </Box>

          {result.solutions.length > 0 && (
            <>
              <SolutionGrid
                board={result.solutions[0]}
                rows={gridConfig.rows}
                cols={gridConfig.cols}
              />
              <Button
                size="small"
                variant="outlined"
                fullWidth
                onClick={() => applySolution(result.solutions[0])}
              >
                Apply to board
              </Button>
            </>
          )}
        </Box>
      )}
    </Box>
  )
}
