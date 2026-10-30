export type Player = "X" | "O";
export type Cell = Player | null;
/** Nine cells, row by row: 0 1 2 / 3 4 5 / 6 7 8. */
export type Board = readonly Cell[];
export type Line = readonly [number, number, number];

export const SIZE = 9;

export const LINES: readonly Line[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function emptyBoard(): Cell[] {
  return Array.from({ length: SIZE }, () => null);
}

export function other(player: Player): Player {
  return player === "X" ? "O" : "X";
}

export function cellAt(board: Board, index: number): Cell {
  return board[index] ?? null;
}

export function winnerLine(board: Board): { player: Player; line: Line } | null {
  for (const line of LINES) {
    const [a, b, c] = line;
    const first = cellAt(board, a);
    if (first !== null && first === cellAt(board, b) && first === cellAt(board, c)) {
      return { player: first, line };
    }
  }
  return null;
}

export function winner(board: Board): Player | null {
  return winnerLine(board)?.player ?? null;
}

export function legalMoves(board: Board): number[] {
  const moves: number[] = [];
  for (let i = 0; i < SIZE; i++) if (cellAt(board, i) === null) moves.push(i);
  return moves;
}

export function isFull(board: Board): boolean {
  return legalMoves(board).length === 0;
}

export function isOver(board: Board): boolean {
  return winner(board) !== null || isFull(board);
}

/** Returns a new board; throws when the cell is taken or out of range. */
export function play(board: Board, move: number, player: Player): Cell[] {
  if (!Number.isInteger(move) || move < 0 || move >= SIZE || cellAt(board, move) !== null) {
    throw new Error(`Illegal move ${move}`);
  }
  const next = [...board];
  next[move] = player;
  return next;
}

/** X always starts, so whose turn it is follows from the piece counts. */
export function nextPlayer(board: Board): Player {
  const x = board.filter((c) => c === "X").length;
  const o = board.filter((c) => c === "O").length;
  return x <= o ? "X" : "O";
}

/** Compact key for a position, used to de-duplicate positions in tests. */
export function boardKey(board: Board): string {
  return board.map((c) => c ?? "-").join("");
}
