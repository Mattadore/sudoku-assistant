type Parity = 'odd' | 'even'

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

  loadPuzzleData = (data: { cells: BoardIndex[] }) => {
    this.cells = new Set(data.cells.map(([r, c]) => `${r},${c}`))
  }
}
