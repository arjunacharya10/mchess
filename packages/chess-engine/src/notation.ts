import { squareToAlgebraic } from "./board.js";
import type { Move, PieceType } from "./types.js";

const PIECE_LETTERS: Record<PieceType, string> = {
  pawn: "",
  knight: "N",
  bishop: "B",
  rook: "R",
  queen: "Q",
  king: "K",
};

/**
 * Human-readable notation for this variant. Standard SAN assumes an 8x8 board with a
 * queen in the starting position and isn't a clean fit here, so this is a simpler
 * custom scheme: e.g. "Nb1-c3", "Bc1xf4", "e2-e4", "d7-d8=Q", "e5xd6 e.p."
 * It intentionally omits SAN's disambiguation and check/mate suffixes.
 */
export function moveToNotation(move: Move): string {
  const letter = PIECE_LETTERS[move.piece.type];
  const from = squareToAlgebraic(move.from);
  const to = squareToAlgebraic(move.to);
  const capture = move.capturedPiece ? "x" : "-";
  const promotion = move.promotion ? `=${PIECE_LETTERS[move.promotion]}` : "";
  const enPassant = move.isEnPassant ? " e.p." : "";
  return `${letter}${from}${capture}${to}${promotion}${enPassant}`;
}

export interface SerializedMove {
  from: string;
  to: string;
  piece: PieceType;
  capturedPiece?: PieceType;
  promotion?: PieceType;
  isEnPassant?: boolean;
  notation: string;
}

/** Algebraic, JSON-friendly form of a Move for archival (e.g. D1 move_log) or the wire protocol. */
export function serializeMove(move: Move): SerializedMove {
  return {
    from: squareToAlgebraic(move.from),
    to: squareToAlgebraic(move.to),
    piece: move.piece.type,
    capturedPiece: move.capturedPiece?.type,
    promotion: move.promotion,
    isEnPassant: move.isEnPassant,
    notation: moveToNotation(move),
  };
}
