export const BOARD_SIZE = 7;

export type Color = "white" | "black";

export type PieceType = "pawn" | "knight" | "bishop" | "rook" | "queen" | "king";

export interface Piece {
  type: PieceType;
  color: Color;
}

/** Index into a flat 49-cell board: index = rank * BOARD_SIZE + file, file/rank in [0,6]. */
export type Square = number;

export type Board = (Piece | null)[];

export interface Move {
  from: Square;
  to: Square;
  piece: Piece;
  capturedPiece?: Piece;
  promotion?: PieceType;
  isEnPassant?: boolean;
  isDoublePawnPush?: boolean;
}

export interface GameState {
  board: Board;
  sideToMove: Color;
  /** Square a pawn can be captured on via en passant, or null. */
  enPassantTarget: Square | null;
  halfmoveClock: number;
  fullmoveNumber: number;
  /** Zobrist-style hashes of prior positions (including current), for threefold repetition. */
  positionHistory: string[];
  moveHistory: Move[];
}

export type GameResult =
  | "checkmate"
  | "stalemate"
  | "insufficient-material"
  | "threefold-repetition"
  | "fifty-move-rule";

export interface GameStatus {
  inCheck: boolean;
  isGameOver: boolean;
  result: GameResult | null;
  /** Color of the winner if the game is over by checkmate, otherwise null (draw or ongoing). */
  winner: Color | null;
}

export function otherColor(color: Color): Color {
  return color === "white" ? "black" : "white";
}
