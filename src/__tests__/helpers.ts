export function makeEmptyBoard(size = 9): BoardState {
  const board: BoardState = []
  for (let r = 0; r < size; r++) {
    board.push([])
    for (let c = 0; c < size; c++) {
      board[r].push({
        number: null,
        center: { numbers: [], letters: [] },
        topLeftCorner: { numbers: [], letters: [] },
        bottomRightCorner: { numbers: [], letters: [] },
        color: [],
      })
    }
  }
  return board
}

export function placeNumber(
  board: BoardState,
  row: number,
  col: number,
  num: number,
) {
  board[row][col].number = num
}
