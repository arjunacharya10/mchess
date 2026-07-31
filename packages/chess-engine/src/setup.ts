import { createEmptyBoard, squareOf } from "./board.js";
import type { GameState, Piece, PieceType } from "./types.js";
import { computePositionHash } from "./hashing.js";

/** Back rank order across the 7 files (a-g), king centered on d-file. No queen at setup. */
const BACK_RANK: PieceType[] = ["rook", "knight", "bishop", "king", "bishop", "knight", "rook"];

export function createInitialGameState(): GameState {
  const board = createEmptyBoard();

  for (let file = 0; file < 7; file++) {
    setPiece(board, file, 0, { type: BACK_RANK[file], color: "white" });
    setPiece(board, file, 1, { type: "pawn", color: "white" });
    setPiece(board, file, 6, { type: BACK_RANK[file], color: "black" });
    setPiece(board, file, 5, { type: "pawn", color: "black" });
  }

  const state: GameState = {
    board,
    sideToMove: "white",
    enPassantTarget: null,
    halfmoveClock: 0,
    fullmoveNumber: 1,
    positionHistory: [],
    moveHistory: [],
  };

  state.positionHistory.push(computePositionHash(state));
  return state;
}

function setPiece(board: (Piece | null)[], file: number, rank: number, piece: Piece): void {
  board[squareOf(file, rank)] = piece;
}
