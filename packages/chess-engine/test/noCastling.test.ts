import { describe, expect, it } from "vitest";
import { algebraicToSquare } from "../src/board.js";
import { createInitialGameState } from "../src/setup.js";
import { generatePseudoLegalMoves } from "../src/moveGen.js";

describe("Castling is not part of this variant", () => {
  it("the king has no legal moves at all from its starting square (boxed in by pawns/pieces)", () => {
    const state = createInitialGameState();
    const moves = generatePseudoLegalMoves(state, algebraicToSquare("d1"));
    expect(moves).toEqual([]);
  });

  it("a king with open space only ever moves one square, never two", () => {
    const state = createInitialGameState();
    // Clear the squares around the white king to isolate king-move generation.
    state.board[algebraicToSquare("d2")] = null;
    state.board[algebraicToSquare("c1")] = null;
    state.board[algebraicToSquare("e1")] = null;
    const moves = generatePseudoLegalMoves(state, algebraicToSquare("d1"));
    const distances = moves.map((m) => Math.abs(m.to - algebraicToSquare("d1")));
    // Every destination is exactly one file and/or one rank away (index delta of 1 or 7).
    for (const m of moves) {
      const fromFile = algebraicToSquare("d1") % 7;
      const toFile = m.to % 7;
      expect(Math.abs(toFile - fromFile)).toBeLessThanOrEqual(1);
    }
    expect(moves.length).toBeGreaterThan(0);
  });
});
