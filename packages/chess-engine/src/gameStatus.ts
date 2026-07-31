import { fileOf, rankOf } from "./board.js";
import { getAllLegalMoves, isKingInCheck } from "./legalMoves.js";
import { computePositionHash } from "./hashing.js";
import type { GameState, GameStatus, Piece } from "./types.js";

const FIFTY_MOVE_HALFMOVE_LIMIT = 100;
const THREEFOLD_REPETITION_COUNT = 3;

function squareColor(square: number): "light" | "dark" {
  return (fileOf(square) + rankOf(square)) % 2 === 0 ? "dark" : "light";
}

/**
 * True if neither side has enough material to possibly deliver checkmate:
 * K v K; K+single minor v K; or K+B v K+B where both bishops sit on same-colored squares.
 * A queen only ever exists via promotion in this variant, but if one is present material
 * is always sufficient, same as any rook or pawn being present.
 */
function isInsufficientMaterial(state: GameState): boolean {
  const nonKingPieces: { piece: Piece; square: number }[] = [];
  state.board.forEach((piece, square) => {
    if (piece && piece.type !== "king") nonKingPieces.push({ piece, square });
  });

  if (nonKingPieces.length === 0) return true;

  if (nonKingPieces.length === 1) {
    return nonKingPieces[0].piece.type === "bishop" || nonKingPieces[0].piece.type === "knight";
  }

  if (nonKingPieces.length === 2) {
    const [a, b] = nonKingPieces;
    if (
      a.piece.type === "bishop" &&
      b.piece.type === "bishop" &&
      a.piece.color !== b.piece.color &&
      squareColor(a.square) === squareColor(b.square)
    ) {
      return true;
    }
  }

  return false;
}

function isThreefoldRepetition(state: GameState): boolean {
  const currentHash = computePositionHash(state);
  const occurrences = state.positionHistory.filter((hash) => hash === currentHash).length;
  return occurrences >= THREEFOLD_REPETITION_COUNT;
}

export function getGameStatus(state: GameState): GameStatus {
  const inCheck = isKingInCheck(state, state.sideToMove);
  const hasLegalMoves = getAllLegalMoves(state).length > 0;

  if (!hasLegalMoves) {
    return inCheck
      ? {
          inCheck,
          isGameOver: true,
          result: "checkmate",
          winner: state.sideToMove === "white" ? "black" : "white",
        }
      : { inCheck, isGameOver: true, result: "stalemate", winner: null };
  }

  if (state.halfmoveClock >= FIFTY_MOVE_HALFMOVE_LIMIT) {
    return { inCheck, isGameOver: true, result: "fifty-move-rule", winner: null };
  }

  if (isThreefoldRepetition(state)) {
    return { inCheck, isGameOver: true, result: "threefold-repetition", winner: null };
  }

  if (isInsufficientMaterial(state)) {
    return { inCheck, isGameOver: true, result: "insufficient-material", winner: null };
  }

  return { inCheck, isGameOver: false, result: null, winner: null };
}
