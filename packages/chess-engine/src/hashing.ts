import type { GameState } from "./types.js";

/**
 * Canonical string key for a position (board + side to move + en passant target).
 * Used for threefold-repetition detection. A plain canonical string is used instead of
 * a numeric Zobrist hash to avoid any collision risk on this small 49-square board.
 */
export function computePositionHash(state: GameState): string {
  const boardKey = state.board
    .map((piece) => (piece ? `${piece.color[0]}${piece.type[0]}` : "--"))
    .join("");
  return `${boardKey}|${state.sideToMove}|${state.enPassantTarget ?? "-"}`;
}
