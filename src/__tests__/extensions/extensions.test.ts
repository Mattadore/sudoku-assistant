import { describe, it, expect } from 'vitest'
import { makeEmptyBoard, placeNumber } from '../helpers'
import Sudoku from '../../solver-extensions/Sudoku'
import Thermometer from '../../solver-extensions/Thermometer'
import AntiKnight from '../../solver-extensions/AntiKnight'
import AntiKing from '../../solver-extensions/AntiKing'
import NonConsecutive from '../../solver-extensions/NonConsecutive'
import DisjointGroups from '../../solver-extensions/DisjointGroups'
import Diagonal from '../../solver-extensions/Diagonal'
import OddEven from '../../solver-extensions/OddEven'
import MinMax from '../../solver-extensions/MinMax'
import Palindrome from '../../solver-extensions/Palindrome'
import Renban from '../../solver-extensions/Renban'
import Whispers from '../../solver-extensions/Whispers'
import BetweenLine from '../../solver-extensions/BetweenLine'
import KillerCage from '../../solver-extensions/KillerCage'
import Difference from '../../solver-extensions/Difference'
import Ratio from '../../solver-extensions/Ratio'
import XV from '../../solver-extensions/XV'

// Helper: check if a conflict set includes a specific cell+number
function hasConflict(conflicts: number[][], row: number, col: number, num: number) {
  return conflicts.some(
    (c) => c[0] === row && c[1] === col && c.slice(2).includes(num),
  )
}

describe('Sudoku', () => {
  const ext = new Sudoku()

  it('returns no conflicts for empty cell', () => {
    expect(ext.getCellConflicts(makeEmptyBoard(), [0, 0])).toEqual([])
  })

  it('returns row/col/box conflicts', () => {
    const board = makeEmptyBoard()
    placeNumber(board, 0, 0, 5)
    const conflicts = ext.getCellConflicts(board, [0, 0])
    // Row: 8, Col: 8, Box: 8 (includes row/col overlaps as separate entries)
    expect(conflicts.length).toBe(24)
    expect(hasConflict(conflicts, 0, 4, 5)).toBe(true) // same row
    expect(hasConflict(conflicts, 4, 0, 5)).toBe(true) // same col
    expect(hasConflict(conflicts, 1, 1, 5)).toBe(true) // same box
  })
})

describe('AntiKnight', () => {
  const ext = new AntiKnight()

  it('returns no conflicts for empty cell', () => {
    expect(ext.getCellConflicts(makeEmptyBoard(), [4, 4])).toEqual([])
  })

  it('returns knight-move conflicts', () => {
    const board = makeEmptyBoard()
    placeNumber(board, 4, 4, 3)
    const conflicts = ext.getCellConflicts(board, [4, 4])
    expect(conflicts.length).toBe(8) // center cell has all 8 knight moves
    expect(hasConflict(conflicts, 2, 3, 3)).toBe(true)
    expect(hasConflict(conflicts, 6, 5, 3)).toBe(true)
  })

  it('handles corner cells (fewer moves)', () => {
    const board = makeEmptyBoard()
    placeNumber(board, 0, 0, 1)
    const conflicts = ext.getCellConflicts(board, [0, 0])
    expect(conflicts.length).toBe(2)
  })
})

describe('AntiKing', () => {
  const ext = new AntiKing()

  it('returns king-move conflicts', () => {
    const board = makeEmptyBoard()
    placeNumber(board, 4, 4, 7)
    const conflicts = ext.getCellConflicts(board, [4, 4])
    expect(conflicts.length).toBe(8)
    expect(hasConflict(conflicts, 3, 3, 7)).toBe(true)
    expect(hasConflict(conflicts, 5, 5, 7)).toBe(true)
  })

  it('handles corner cells', () => {
    const board = makeEmptyBoard()
    placeNumber(board, 0, 0, 1)
    expect(ext.getCellConflicts(board, [0, 0]).length).toBe(3)
  })
})

describe('NonConsecutive', () => {
  const ext = new NonConsecutive()

  it('returns N-1 and N+1 for orthogonal neighbors', () => {
    const board = makeEmptyBoard()
    placeNumber(board, 4, 4, 5)
    const conflicts = ext.getCellConflicts(board, [4, 4])
    expect(conflicts.length).toBe(4) // 4 orthogonal neighbors
    expect(hasConflict(conflicts, 3, 4, 4)).toBe(true) // N-1
    expect(hasConflict(conflicts, 3, 4, 6)).toBe(true) // N+1
  })

  it('handles edge values (1 only conflicts on 2)', () => {
    const board = makeEmptyBoard()
    placeNumber(board, 0, 0, 1)
    const conflicts = ext.getCellConflicts(board, [0, 0])
    for (const c of conflicts) {
      expect(c.slice(2)).toEqual([2]) // only N+1
    }
  })
})

describe('DisjointGroups', () => {
  const ext = new DisjointGroups()

  it('conflicts with same-position cells in other boxes', () => {
    const board = makeEmptyBoard()
    placeNumber(board, 0, 0, 4) // position (0,0) in box
    const conflicts = ext.getCellConflicts(board, [0, 0])
    // 8 other boxes, each has cell at position (0,0)
    expect(conflicts.length).toBe(8)
    expect(hasConflict(conflicts, 3, 3, 4)).toBe(true)
    expect(hasConflict(conflicts, 6, 6, 4)).toBe(true)
  })
})

describe('Diagonal', () => {
  it('negative diagonal: conflicts along (0,0)-(8,8)', () => {
    const ext = new Diagonal('negative')
    const board = makeEmptyBoard()
    placeNumber(board, 0, 0, 5)
    const conflicts = ext.getCellConflicts(board, [0, 0])
    expect(conflicts.length).toBe(8)
    expect(hasConflict(conflicts, 4, 4, 5)).toBe(true)
  })

  it('positive diagonal: conflicts along (8,0)-(0,8)', () => {
    const ext = new Diagonal('positive')
    const board = makeEmptyBoard()
    placeNumber(board, 0, 8, 3)
    const conflicts = ext.getCellConflicts(board, [0, 8])
    expect(conflicts.length).toBe(8)
    expect(hasConflict(conflicts, 8, 0, 3)).toBe(true)
  })

  it('non-diagonal cell returns no conflicts', () => {
    const ext = new Diagonal('negative')
    const board = makeEmptyBoard()
    placeNumber(board, 0, 1, 5)
    expect(ext.getCellConflicts(board, [0, 1])).toEqual([])
  })
})

describe('OddEven', () => {
  it('odd cell conflicts on even numbers', () => {
    const ext = new OddEven('odd')
    ext.loadPuzzleData!({ cells: [[0, 0]] })
    const board = makeEmptyBoard()
    placeNumber(board, 0, 0, 4) // even number in odd cell
    const conflicts = ext.getCellConflicts(board, [0, 0])
    expect(conflicts.length).toBe(1)
    expect(conflicts[0].slice(2)).toEqual([2, 4, 6, 8])
  })

  it('odd cell with odd number has no conflicts', () => {
    const ext = new OddEven('odd')
    ext.loadPuzzleData!({ cells: [[0, 0]] })
    const board = makeEmptyBoard()
    placeNumber(board, 0, 0, 3)
    expect(ext.getCellConflicts(board, [0, 0])).toEqual([])
  })
})

describe('MinMax', () => {
  it('minimum cell constrains neighbors to be greater', () => {
    const ext = new MinMax('minimum')
    ext.loadPuzzleData!({ cells: [[4, 4]] })
    const board = makeEmptyBoard()
    placeNumber(board, 4, 4, 3)
    const conflicts = ext.getCellConflicts(board, [4, 4])
    expect(conflicts.length).toBe(4)
    // Each neighbor conflicts on 1, 2, 3
    expect(hasConflict(conflicts, 3, 4, 1)).toBe(true)
    expect(hasConflict(conflicts, 3, 4, 3)).toBe(true)
    expect(hasConflict(conflicts, 3, 4, 4)).toBe(false)
  })
})

describe('Palindrome', () => {
  it('mirror positions must match', () => {
    const ext = new Palindrome()
    ext.loadPuzzleData!({ lines: [[[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]]] })
    const board = makeEmptyBoard()
    placeNumber(board, 0, 0, 5)
    const conflicts = ext.getCellConflicts(board, [0, 0])
    // Mirror of position 0 is position 4 ([0,4])
    expect(hasConflict(conflicts, 0, 4, 1)).toBe(true) // all except 5
    expect(hasConflict(conflicts, 0, 4, 5)).toBe(false)
  })
})

describe('Renban', () => {
  it('no repeats on renban line', () => {
    const ext = new Renban()
    ext.loadPuzzleData!({ lines: [[[0, 0], [0, 1], [0, 2]]] })
    const board = makeEmptyBoard()
    placeNumber(board, 0, 0, 4)
    const conflicts = ext.getCellConflicts(board, [0, 0])
    expect(hasConflict(conflicts, 0, 1, 4)).toBe(true)
    expect(hasConflict(conflicts, 0, 2, 4)).toBe(true)
  })
})

describe('Whispers', () => {
  it('adjacent cells must differ by >= 5', () => {
    const ext = new Whispers()
    ext.loadPuzzleData!({ lines: [[[0, 0], [0, 1], [0, 2]]] })
    const board = makeEmptyBoard()
    placeNumber(board, 0, 1, 5) // middle cell
    const conflicts = ext.getCellConflicts(board, [0, 1])
    // Numbers within 4 of 5: 1,2,3,4,5,6,7,8,9 where |n-5| < 5 → 1,2,3,4,5,6,7,8,9
    // Actually |n-5| < 5 means n in [1,9], so all numbers conflict except none
    // Wait: 1 has |1-5|=4 < 5, 9 has |9-5|=4 < 5. So ALL 1-9 are bad.
    // That means 5 on a whisper line conflicts with everything adjacent (correct: no valid neighbor for 5)
    expect(hasConflict(conflicts, 0, 0, 1)).toBe(true)
    expect(hasConflict(conflicts, 0, 0, 9)).toBe(true)
  })

  it('value 1 allows 6-9 as neighbors', () => {
    const ext = new Whispers()
    ext.loadPuzzleData!({ lines: [[[0, 0], [0, 1]]] })
    const board = makeEmptyBoard()
    placeNumber(board, 0, 0, 1)
    const conflicts = ext.getCellConflicts(board, [0, 0])
    expect(hasConflict(conflicts, 0, 1, 5)).toBe(true) // |5-1|=4 < 5
    expect(hasConflict(conflicts, 0, 1, 6)).toBe(false) // |6-1|=5, ok
    expect(hasConflict(conflicts, 0, 1, 9)).toBe(false) // |9-1|=8, ok
  })
})

describe('BetweenLine', () => {
  it('middle cells conflict on numbers outside endpoint range', () => {
    const ext = new BetweenLine()
    ext.loadPuzzleData!({ lines: [[[0, 0], [0, 1], [0, 2]]] })
    const board = makeEmptyBoard()
    placeNumber(board, 0, 0, 2) // endpoint 1
    placeNumber(board, 0, 2, 8) // endpoint 2
    const conflicts = ext.getCellConflicts(board, [0, 0])
    // Middle cell [0,1] must be strictly between 2 and 8, so conflicts on <= 2 and >= 8
    expect(hasConflict(conflicts, 0, 1, 1)).toBe(true)
    expect(hasConflict(conflicts, 0, 1, 2)).toBe(true)
    expect(hasConflict(conflicts, 0, 1, 8)).toBe(true)
    expect(hasConflict(conflicts, 0, 1, 5)).toBe(false) // 5 is between 2 and 8
  })
})

describe('KillerCage', () => {
  it('no repeats within cage (always enforced)', () => {
    const ext = new KillerCage()
    ext.loadPuzzleData!({ cages: [{ cells: [[0, 0], [0, 1], [1, 0]], total: 10 }] })
    const board = makeEmptyBoard()
    placeNumber(board, 0, 0, 3)
    placeNumber(board, 0, 1, 3) // duplicate
    const conflicts = ext.getCellConflicts(board, [0, 0])
    expect(hasConflict(conflicts, 0, 1, 3)).toBe(true)
  })

  it('wrong sum flags all cells including self when cage is full', () => {
    const ext = new KillerCage()
    ext.loadPuzzleData!({ cages: [{ cells: [[0, 0], [0, 1], [1, 0]], total: 10 }] })
    const board = makeEmptyBoard()
    placeNumber(board, 0, 0, 1)
    placeNumber(board, 0, 1, 2)
    placeNumber(board, 1, 0, 3) // sum = 6, total = 10 → wrong
    const conflicts = ext.getCellConflicts(board, [0, 0])
    // All cells' numbers should conflict (including self)
    expect(hasConflict(conflicts, 0, 0, 1)).toBe(true) // self
    expect(hasConflict(conflicts, 0, 1, 2)).toBe(true)
    expect(hasConflict(conflicts, 1, 0, 3)).toBe(true)
  })

  it('correct sum with duplicate still flags duplicate', () => {
    const ext = new KillerCage()
    ext.loadPuzzleData!({ cages: [{ cells: [[0, 0], [0, 1], [1, 0]], total: 10 }] })
    const board = makeEmptyBoard()
    placeNumber(board, 0, 0, 3)
    placeNumber(board, 0, 1, 4)
    placeNumber(board, 1, 0, 3) // sum = 10 ✓, but 3 repeats
    const conflicts = ext.getCellConflicts(board, [0, 0])
    // Duplicate 3 IS flagged
    expect(hasConflict(conflicts, 1, 0, 3)).toBe(true)
    // No sum conflict, so [0,1] with 4 is NOT flagged
    expect(hasConflict(conflicts, 0, 1, 4)).toBe(false)
  })

  it('no conflicts when cage is partially filled', () => {
    const ext = new KillerCage()
    ext.loadPuzzleData!({ cages: [{ cells: [[0, 0], [0, 1], [1, 0]], total: 10 }] })
    const board = makeEmptyBoard()
    placeNumber(board, 0, 0, 3) // only one cell filled, no duplicates
    const conflicts = ext.getCellConflicts(board, [0, 0])
    expect(conflicts.length).toBe(0) // no duplicate, cage not full → no conflicts
  })
})

describe('Difference', () => {
  it('cells must differ by the specified value', () => {
    const ext = new Difference()
    ext.loadPuzzleData!({ pairs: [{ cells: [[0, 0], [0, 1]], value: 1 }] })
    const board = makeEmptyBoard()
    placeNumber(board, 0, 0, 5)
    const conflicts = ext.getCellConflicts(board, [0, 0])
    // Only 4 and 6 are valid for [0,1]
    expect(hasConflict(conflicts, 0, 1, 4)).toBe(false)
    expect(hasConflict(conflicts, 0, 1, 6)).toBe(false)
    expect(hasConflict(conflicts, 0, 1, 5)).toBe(true) // differs by 0
    expect(hasConflict(conflicts, 0, 1, 3)).toBe(true) // differs by 2
  })
})

describe('Ratio', () => {
  it('cells must have the specified ratio', () => {
    const ext = new Ratio()
    ext.loadPuzzleData!({ pairs: [{ cells: [[0, 0], [0, 1]], value: 2 }] })
    const board = makeEmptyBoard()
    placeNumber(board, 0, 0, 4)
    const conflicts = ext.getCellConflicts(board, [0, 0])
    // Valid: 2 (4/2) or 8 (4*2)
    expect(hasConflict(conflicts, 0, 1, 2)).toBe(false)
    expect(hasConflict(conflicts, 0, 1, 8)).toBe(false)
    expect(hasConflict(conflicts, 0, 1, 3)).toBe(true)
  })
})

describe('XV', () => {
  it('X means sum = 10', () => {
    const ext = new XV()
    ext.loadPuzzleData!({ pairs: [{ cells: [[0, 0], [0, 1]], value: 'X' }] })
    const board = makeEmptyBoard()
    placeNumber(board, 0, 0, 3)
    const conflicts = ext.getCellConflicts(board, [0, 0])
    // Only 7 is valid (3+7=10)
    expect(hasConflict(conflicts, 0, 1, 7)).toBe(false)
    expect(hasConflict(conflicts, 0, 1, 6)).toBe(true)
  })

  it('V means sum = 5', () => {
    const ext = new XV()
    ext.loadPuzzleData!({ pairs: [{ cells: [[0, 0], [0, 1]], value: 'V' }] })
    const board = makeEmptyBoard()
    placeNumber(board, 0, 0, 2)
    const conflicts = ext.getCellConflicts(board, [0, 0])
    // Only 3 is valid (2+3=5)
    expect(hasConflict(conflicts, 0, 1, 3)).toBe(false)
    expect(hasConflict(conflicts, 0, 1, 4)).toBe(true)
  })
})

describe('Thermometer', () => {
  it('predecessors conflict on numbers >= cell value', () => {
    const ext = new Thermometer()
    ext.loadPuzzleData!({ lines: [[[0, 0], [0, 1], [0, 2]]] })
    const board = makeEmptyBoard()
    placeNumber(board, 0, 1, 5) // middle of thermo
    const conflicts = ext.getCellConflicts(board, [0, 1])
    // Predecessor [0,0] must be < 5, so conflicts on 5,6,7,8,9
    expect(hasConflict(conflicts, 0, 0, 5)).toBe(true)
    expect(hasConflict(conflicts, 0, 0, 4)).toBe(false)
    // Successor [0,2] must be > 5, so conflicts on 1,2,3,4,5
    expect(hasConflict(conflicts, 0, 2, 5)).toBe(true)
    expect(hasConflict(conflicts, 0, 2, 6)).toBe(false)
  })
})
