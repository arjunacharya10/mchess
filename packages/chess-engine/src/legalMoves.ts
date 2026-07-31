import { isSquareAttacked } from "./attacks.js";
import { findKingSquare } from "./board.js";
import { applyMove } from "./makeMove.js";
import { generateAllPseudoLegalMoves, generatePseudoLegalMoves } from "./moveGen.js";
import { otherColor, type Color, type GameState, type Move, type Square } from "./types.js";

export function isKingInCheck(state: GameState, color: Color): boolean {
  const kingSquare = findKingSquare(state.board, color);
  return isSquareAttacked(state.board, kingSquare, otherColor(color));
}

function filterLegal(state: GameState, moves: Move[], movingColor: Color): Move[] {
  return moves.filter((move) => {
    const resulting = applyMove(state, move);
    return !isKingInCheck(resulting, movingColor);
  });
}

/** Legal moves for the piece on `square`, or [] if it's empty or not the side to move. */
export function getLegalMoves(state: GameState, square: Square): Move[] {
  const piece = state.board[square];
  if (!piece || piece.color !== state.sideToMove) return [];
  return filterLegal(state, generatePseudoLegalMoves(state, square), piece.color);
}

/** All legal moves for the side to move. */
export function getAllLegalMoves(state: GameState): Move[] {
  const pseudoLegal = generateAllPseudoLegalMoves(state, state.sideToMove);
  return filterLegal(state, pseudoLegal, state.sideToMove);
}
