import type { ConstraintHandler } from '../solver/solverTypes'

type Parity = 'odd' | 'even'

// Parity is a domain restriction, not a propagation rule: we just narrow
// each constrained cell's domain to odd or even digits at initialization.
export const solverHandler: ConstraintHandler = {
  cellsOf: (con) => [con.cell as number],
  propagate: () => true, // domain is fully set by initialize; nothing to propagate
  initialize: (con, _N, board, domains, maxDigit) => {
    const c = con.cell as number
    if (board[c] > 0) return true // already placed, domain already a singleton
    const isOdd = (con.parity as string) === 'odd'
    let mask = 0
    for (let d = 1; d <= maxDigit; d++) {
      if (isOdd ? d % 2 === 1 : d % 2 === 0) mask |= 1 << d
    }
    const nd = domains[c] & mask
    if (nd === 0) return false
    domains[c] = nd
    return true
  },
}

export default class OddEven implements SolverExtension {
  extensionName: string
  private parity: Parity
  private cells: Set<string> = new Set()

  constructor(parity: Parity) {
    this.parity = parity
    this.extensionName = parity
  }

  isRelevant = (index: BoardIndex): boolean => {
    return this.cells.has(`${index[0]},${index[1]}`)
  }

  getCellConflicts = (board: BoardState, index: BoardIndex): number[][] => {
    const num = board[index[0]][index[1]].number
    if (!num) return []
    if (!this.isRelevant(index)) return []
    // Check if the number violates the parity constraint
    const isOdd = num % 2 === 1
    if (this.parity === 'odd' && isOdd) return []
    if (this.parity === 'even' && !isOdd) return []
    // Self-conflict: this number shouldn't be here
    const badNums =
      this.parity === 'odd'
        ? [2, 4, 6, 8]
        : [1, 3, 5, 7, 9]
    return [[index[0], index[1], ...badNums]]
  }

  getCellDecoration = (_board: BoardState, row: number, column: number): any => {
    if (!this.cells.has(`${row},${column}`)) return null
    const size = this.parity === 'odd' ? '60%' : '55%'
    return (
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: size,
          height: size,
          borderRadius: this.parity === 'odd' ? '50%' : '2px',
          backgroundColor: 'rgba(180, 180, 180, 0.3)',
          zIndex: 100,
          pointerEvents: 'none',
        }}
      />
    )
  }

  serializeConstraints = (_rows: number, cols: number): SolverConstraint[] => {
    return [...this.cells].map((key) => {
      const [r, c] = key.split(',').map(Number)
      return { type: 'odd_even', cell: r * cols + c, parity: this.parity }
    })
  }

  loadPuzzleData = (data: { cells: BoardIndex[] }) => {
    this.cells = new Set(data.cells.map(([r, c]) => `${r},${c}`))
  }
}
