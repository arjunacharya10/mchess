import { fileOf, isOnBoard, rankOf, squareOf } from "./board.js";
import { BOARD_SIZE } from "./types.js";
import type { Board, Color, GameState, Move, Piece, PieceType, Square } from "./types.js";

/** Rook and Bishop may slide at most this many squares per move in this variant. */
export const CAPPED_SLIDE_DISTANCE = 3;
/** Queen (promotion-only piece) slides without the cap, i.e. the full board length. */
export const UNLIMITED_SLIDE_DISTANCE = BOARD_SIZE - 1;

export type Direction = readonly [number, number];

export const ROOK_DIRECTIONS: readonly Direction[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export const BISHOP_DIRECTIONS: readonly Direction[] = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

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

/**
 * Generic ray-walker shared by Rook, Bishop, and Queen move generation (and by
 * attack detection in attacks.ts), so the sliding-distance cap can never diverge
 * between "can this piece move here" and "does this piece attack that square."
 */
export function slideMoves(
  board: Board,
  from: Square,
  directions: readonly Direction[],
  maxSteps: number,
  color: Color,
): Move[] {
  const moves: Move[] = [];
  const piece = board[from];
  if (!piece) return moves;
  const fromFile = fileOf(from);
  const fromRank = rankOf(from);

  for (const [df, dr] of directions) {
    for (let step = 1; step <= maxSteps; step++) {
      const file = fromFile + df * step;
      const rank = fromRank + dr * step;
      if (!isOnBoard(file, rank)) break;
      const to = squareOf(file, rank);
      const occupant = board[to];
      if (!occupant) {
        moves.push({ from, to, piece });
        continue;
      }
      if (occupant.color !== color) {
        moves.push({ from, to, piece, capturedPiece: occupant });
      }
      break;
    }
  }
  return moves;
}

function stepMoves(board: Board, from: Square, offsets: readonly Direction[], color: Color): Move[] {
  const moves: Move[] = [];
  const piece = board[from];
  if (!piece) return moves;
  const fromFile = fileOf(from);
  const fromRank = rankOf(from);

  for (const [df, dr] of offsets) {
    const file = fromFile + df;
    const rank = fromRank + dr;
    if (!isOnBoard(file, rank)) continue;
    const to = squareOf(file, rank);
    const occupant = board[to];
    if (!occupant) {
      moves.push({ from, to, piece });
    } else if (occupant.color !== color) {
      moves.push({ from, to, piece, capturedPiece: occupant });
    }
  }
  return moves;
}

function rookMoves(board: Board, from: Square, color: Color): Move[] {
  return slideMoves(board, from, ROOK_DIRECTIONS, CAPPED_SLIDE_DISTANCE, color);
}

function bishopMoves(board: Board, from: Square, color: Color): Move[] {
  return slideMoves(board, from, BISHOP_DIRECTIONS, CAPPED_SLIDE_DISTANCE, color);
}

function queenMoves(board: Board, from: Square, color: Color): Move[] {
  return [
    ...slideMoves(board, from, ROOK_DIRECTIONS, UNLIMITED_SLIDE_DISTANCE, color),
    ...slideMoves(board, from, BISHOP_DIRECTIONS, UNLIMITED_SLIDE_DISTANCE, color),
  ];
}

function knightMoves(board: Board, from: Square, color: Color): Move[] {
  return stepMoves(board, from, KNIGHT_OFFSETS, color);
}

function kingMoves(board: Board, from: Square, color: Color): Move[] {
  return stepMoves(board, from, KING_OFFSETS, color);
}

function pawnMoves(state: GameState, from: Square, color: Color): Move[] {
  const { board, enPassantTarget } = state;
  const piece = board[from];
  if (!piece) return [];
  const moves: Move[] = [];
  const file = fileOf(from);
  const rank = rankOf(from);
  const direction = color === "white" ? 1 : -1;
  const startRank = color === "white" ? 1 : BOARD_SIZE - 2;
  const promotionRank = color === "white" ? BOARD_SIZE - 1 : 0;

  const oneForwardRank = rank + direction;
  if (isOnBoard(file, oneForwardRank) && !board[squareOf(file, oneForwardRank)]) {
    const to = squareOf(file, oneForwardRank);
    pushPawnMove(moves, from, to, piece, oneForwardRank === promotionRank);

    const twoForwardRank = rank + direction * 2;
    if (rank === startRank && !board[squareOf(file, twoForwardRank)]) {
      moves.push({ from, to: squareOf(file, twoForwardRank), piece, isDoublePawnPush: true });
    }
  }

  for (const df of [-1, 1]) {
    const captureFile = file + df;
    const captureRank = rank + direction;
    if (!isOnBoard(captureFile, captureRank)) continue;
    const to = squareOf(captureFile, captureRank);
    const occupant = board[to];
    const isPromotion = captureRank === promotionRank;
    if (occupant && occupant.color !== color) {
      pushPawnMove(moves, from, to, piece, isPromotion, occupant);
    } else if (!occupant && to === enPassantTarget) {
      const capturedSquare = squareOf(captureFile, rank);
      moves.push({
        from,
        to,
        piece,
        capturedPiece: board[capturedSquare] ?? undefined,
        isEnPassant: true,
      });
    }
  }

  return moves;
}

const PROMOTION_PIECES: PieceType[] = ["queen", "rook", "bishop", "knight"];

function pushPawnMove(
  moves: Move[],
  from: Square,
  to: Square,
  piece: Piece,
  isPromotion: boolean,
  capturedPiece?: Piece,
): void {
  if (!isPromotion) {
    moves.push({ from, to, piece, capturedPiece });
    return;
  }
  for (const promotion of PROMOTION_PIECES) {
    moves.push({ from, to, piece, capturedPiece, promotion });
  }
}

/** Pseudo-legal moves for the piece on `from` (does not check for self-check). */
export function generatePseudoLegalMoves(state: GameState, from: Square): Move[] {
  const piece = state.board[from];
  if (!piece) return [];
  switch (piece.type) {
    case "rook":
      return rookMoves(state.board, from, piece.color);
    case "bishop":
      return bishopMoves(state.board, from, piece.color);
    case "queen":
      return queenMoves(state.board, from, piece.color);
    case "knight":
      return knightMoves(state.board, from, piece.color);
    case "king":
      return kingMoves(state.board, from, piece.color);
    case "pawn":
      return pawnMoves(state, from, piece.color);
  }
}

/** All pseudo-legal moves for every piece of `color` (does not check for self-check). */
export function generateAllPseudoLegalMoves(state: GameState, color: Color): Move[] {
  const moves: Move[] = [];
  for (let square = 0; square < state.board.length; square++) {
    const piece = state.board[square];
    if (piece && piece.color === color) {
      moves.push(...generatePseudoLegalMoves(state, square));
    }
  }
  return moves;
}
