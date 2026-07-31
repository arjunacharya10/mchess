import { BOARD_SIZE, type Board, type Color, type Piece, type Square } from "./types.js";

export function fileOf(square: Square): number {
  return square % BOARD_SIZE;
}

export function rankOf(square: Square): number {
  return Math.floor(square / BOARD_SIZE);
}

export function squareOf(file: number, rank: number): Square {
  return rank * BOARD_SIZE + file;
}

export function isOnBoard(file: number, rank: number): boolean {
  return file >= 0 && file < BOARD_SIZE && rank >= 0 && rank < BOARD_SIZE;
}

export function createEmptyBoard(): Board {
  return new Array(BOARD_SIZE * BOARD_SIZE).fill(null);
}

export function cloneBoard(board: Board): Board {
  return board.slice();
}

const FILE_LETTERS = "abcdefg";

/** Converts a square index to algebraic notation, e.g. 0 -> "a1", 48 -> "g7". */
export function squareToAlgebraic(square: Square): string {
  return `${FILE_LETTERS[fileOf(square)]}${rankOf(square) + 1}`;
}

/** Converts algebraic notation (e.g. "d1") to a square index. Throws on malformed input. */
export function algebraicToSquare(algebraic: string): Square {
  const file = FILE_LETTERS.indexOf(algebraic[0] ?? "");
  const rank = Number(algebraic.slice(1)) - 1;
  if (file === -1 || !Number.isInteger(rank) || !isOnBoard(file, rank)) {
    throw new Error(`Invalid square: ${algebraic}`);
  }
  return squareOf(file, rank);
}

export function pieceAt(board: Board, square: Square): Piece | null {
  return board[square] ?? null;
}

export function findKingSquare(board: Board, color: Color): Square {
  const index = board.findIndex((piece) => piece?.type === "king" && piece.color === color);
  if (index === -1) throw new Error(`No ${color} king on the board`);
  return index;
}
