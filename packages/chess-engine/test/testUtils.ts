import { algebraicToSquare, createEmptyBoard } from "../src/board.js";
import { computePositionHash } from "../src/hashing.js";
import type { Board, Color, GameState, Piece, PieceType } from "../src/types.js";

export interface PlacementSpec {
  square: string;
  type: PieceType;
  color: Color;
}

/** Builds a bare-bones GameState (no kings included by default) for targeted unit tests. */
export function buildState(
  placements: PlacementSpec[],
  overrides: Partial<Omit<GameState, "board">> = {},
): GameState {
  const board: Board = createEmptyBoard();
  for (const { square, type, color } of placements) {
    board[algebraicToSquare(square)] = { type, color } satisfies Piece;
  }

  const state: GameState = {
    board,
    sideToMove: overrides.sideToMove ?? "white",
    enPassantTarget: overrides.enPassantTarget ?? null,
    halfmoveClock: overrides.halfmoveClock ?? 0,
    fullmoveNumber: overrides.fullmoveNumber ?? 1,
    positionHistory: overrides.positionHistory ?? [],
    moveHistory: overrides.moveHistory ?? [],
  };
  if (state.positionHistory.length === 0) {
    state.positionHistory.push(computePositionHash(state));
  }
  return state;
}

/** Convenience: a minimal legal two-king position plus any extra placements. */
export function buildStateWithKings(
  extra: PlacementSpec[],
  whiteKingSquare = "a1",
  blackKingSquare = "g7",
  overrides: Partial<Omit<GameState, "board">> = {},
): GameState {
  return buildState(
    [
      { square: whiteKingSquare, type: "king", color: "white" },
      { square: blackKingSquare, type: "king", color: "black" },
      ...extra,
    ],
    overrides,
  );
}
