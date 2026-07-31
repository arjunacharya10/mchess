import { cloneBoard, fileOf, rankOf, squareOf } from "./board.js";
import { computePositionHash } from "./hashing.js";
import { otherColor, type GameState, type Move } from "./types.js";

/**
 * Applies an already-validated move to a game state, returning a new GameState.
 * Does not check legality (see legalMoves.ts) — callers must only pass moves
 * produced by getLegalMoves/getAllLegalMoves.
 */
export function applyMove(state: GameState, move: Move): GameState {
  const board = cloneBoard(state.board);
  const { from, to, piece, promotion, isEnPassant, isDoublePawnPush } = move;

  board[from] = null;

  if (isEnPassant) {
    const capturedSquare = squareOf(fileOf(to), rankOf(from));
    board[capturedSquare] = null;
  }

  board[to] = promotion ? { type: promotion, color: piece.color } : piece;

  const isPawnMoveOrCapture = piece.type === "pawn" || Boolean(move.capturedPiece);

  const nextState: GameState = {
    board,
    sideToMove: otherColor(state.sideToMove),
    enPassantTarget: isDoublePawnPush ? squareOf(fileOf(to), (rankOf(from) + rankOf(to)) / 2) : null,
    halfmoveClock: isPawnMoveOrCapture ? 0 : state.halfmoveClock + 1,
    fullmoveNumber: state.sideToMove === "black" ? state.fullmoveNumber + 1 : state.fullmoveNumber,
    positionHistory: state.positionHistory,
    moveHistory: [...state.moveHistory, move],
  };

  nextState.positionHistory = [...state.positionHistory, computePositionHash(nextState)];

  return nextState;
}
