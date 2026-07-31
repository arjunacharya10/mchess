import { fileOf, isOnBoard, rankOf, squareOf } from "./board.js";
import {
  BISHOP_DIRECTIONS,
  CAPPED_SLIDE_DISTANCE,
  ROOK_DIRECTIONS,
  UNLIMITED_SLIDE_DISTANCE,
  type Direction,
} from "./moveGen.js";
import type { Board, Color, PieceType, Square } from "./types.js";

/**
 * Walks outward from `square` along `directions`, up to `maxSteps`, stopping at the
 * first occupied square. Returns true if that occupant is an enemy piece of one of
 * `attackerTypes`. Shares the same distance cap as slideMoves() in moveGen.ts, so a
 * Rook/Bishop 4+ squares away can never register as giving check or a pin, while a
 * promoted Queen (unlimited range) still can.
 */
function slidingAttackExists(
  board: Board,
  square: Square,
  directions: readonly Direction[],
  maxSteps: number,
  byColor: Color,
  attackerTypes: readonly PieceType[],
): boolean {
  const file = fileOf(square);
  const rank = rankOf(square);
  for (const [df, dr] of directions) {
    for (let step = 1; step <= maxSteps; step++) {
      const f = file + df * step;
      const r = rank + dr * step;
      if (!isOnBoard(f, r)) break;
      const occupant = board[squareOf(f, r)];
      if (!occupant) continue;
      if (occupant.color === byColor && attackerTypes.includes(occupant.type)) return true;
      break;
    }
  }
  return false;
}

const KNIGHT_OFFSETS: readonly Direction[] = [
  [1, 2],
  [2, 1],
  [2, -1],
  [1, -2],
  [-1, -2],
  [-2, -1],
  [-2, 1],
  [-1, 2],
];

const KING_OFFSETS: readonly Direction[] = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
];

function stepAttackExists(
  board: Board,
  square: Square,
  offsets: readonly Direction[],
  byColor: Color,
  attackerType: PieceType,
): boolean {
  const file = fileOf(square);
  const rank = rankOf(square);
  for (const [df, dr] of offsets) {
    const f = file + df;
    const r = rank + dr;
    if (!isOnBoard(f, r)) continue;
    const occupant = board[squareOf(f, r)];
    if (occupant && occupant.color === byColor && occupant.type === attackerType) return true;
  }
  return false;
}

function pawnAttackExists(board: Board, square: Square, byColor: Color): boolean {
  // A pawn attacks diagonally forward from its own perspective, so to find an attacker
  // of `square` we look one rank "behind" it relative to that pawn color's direction.
  const direction = byColor === "white" ? -1 : 1;
  const file = fileOf(square);
  const rank = rankOf(square) + direction;
  for (const df of [-1, 1]) {
    const f = file + df;
    if (!isOnBoard(f, rank)) continue;
    const occupant = board[squareOf(f, rank)];
    if (occupant && occupant.color === byColor && occupant.type === "pawn") return true;
  }
  return false;
}

/** True if any `byColor` piece attacks `square` on this board. */
export function isSquareAttacked(board: Board, square: Square, byColor: Color): boolean {
  return (
    pawnAttackExists(board, square, byColor) ||
    stepAttackExists(board, square, KNIGHT_OFFSETS, byColor, "knight") ||
    stepAttackExists(board, square, KING_OFFSETS, byColor, "king") ||
    slidingAttackExists(board, square, ROOK_DIRECTIONS, CAPPED_SLIDE_DISTANCE, byColor, ["rook"]) ||
    slidingAttackExists(board, square, BISHOP_DIRECTIONS, CAPPED_SLIDE_DISTANCE, byColor, ["bishop"]) ||
    slidingAttackExists(board, square, ROOK_DIRECTIONS, UNLIMITED_SLIDE_DISTANCE, byColor, ["queen"]) ||
    slidingAttackExists(board, square, BISHOP_DIRECTIONS, UNLIMITED_SLIDE_DISTANCE, byColor, ["queen"])
  );
}
