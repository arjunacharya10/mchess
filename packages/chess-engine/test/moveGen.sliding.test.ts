import { describe, expect, it } from "vitest";
import { algebraicToSquare } from "../src/board.js";
import { generatePseudoLegalMoves } from "../src/moveGen.js";
import { buildState } from "./testUtils.js";

function destinations(moves: ReturnType<typeof generatePseudoLegalMoves>) {
  return moves.map((m) => m.to).sort((a, b) => a - b);
}

describe("Rook range cap", () => {
  it("reaches exactly 3 squares in each direction on an empty board, not a 4th", () => {
    // Rook on d4 (center of the 7x7 board) can reach up to 3 squares each way.
    const state = buildState([{ square: "d4", type: "rook", color: "white" }]);
    const moves = generatePseudoLegalMoves(state, algebraicToSquare("d4"));
    const dests = destinations(moves).map((sq) => sq);
    // Along the d-file and 4th rank, 3 squares each direction: a4,b4,c4,e4,f4,g4,d1,d2,d3,d5,d6,d7
    const expectedAlg = ["a4", "b4", "c4", "e4", "f4", "g4", "d1", "d2", "d3", "d5", "d6", "d7"];
    expect(dests.length).toBe(expectedAlg.length);
    for (const alg of expectedAlg) {
      expect(dests).toContain(algebraicToSquare(alg));
    }
    // A 4th square away (e.g. a4 is exactly 3 away; there is no 4th square on this axis
    // since the board is only 7 wide) -- verify on the taller rank axis instead:
    // d4 -> d1 is 3 away (rank4->rank1); d4 -> d7 is 3 away (rank4->rank7). Both included,
    // and there is no square beyond either end on a 7-rank board, so cap is implicitly
    // demonstrated by the file-axis case below with a longer runway.
  });

  it("cannot reach a 4th square even when the path is open and the board is long enough", () => {
    // Rook on a1: along the rank, squares b1,c1,d1 are 1-3 squares away (reachable),
    // e1 is 4 squares away and must NOT be reachable.
    const state = buildState([{ square: "a1", type: "rook", color: "white" }]);
    const moves = generatePseudoLegalMoves(state, algebraicToSquare("a1"));
    const dests = destinations(moves);
    expect(dests).toContain(algebraicToSquare("d1"));
    expect(dests).not.toContain(algebraicToSquare("e1"));
    expect(dests).toContain(algebraicToSquare("a4"));
    expect(dests).not.toContain(algebraicToSquare("a5"));
  });
});

describe("Bishop range cap", () => {
  it("cannot reach a 4th diagonal square even when open", () => {
    // Bishop on a1 diagonal: b2,c3,d4 reachable (1-3 away), e5 (4 away) must not be.
    const state = buildState([{ square: "a1", type: "bishop", color: "white" }]);
    const moves = generatePseudoLegalMoves(state, algebraicToSquare("a1"));
    const dests = destinations(moves);
    expect(dests).toContain(algebraicToSquare("d4"));
    expect(dests).not.toContain(algebraicToSquare("e5"));
  });
});

describe("Queen (promotion-only) is unlimited", () => {
  it("slides the full board length when unblocked", () => {
    const state = buildState([{ square: "a1", type: "queen", color: "white" }]);
    const moves = generatePseudoLegalMoves(state, algebraicToSquare("a1"));
    const dests = destinations(moves);
    // Full rank a1->g1 (6 squares away) and full file a1->a7 (6 away) and full diagonal a1->g7.
    expect(dests).toContain(algebraicToSquare("g1"));
    expect(dests).toContain(algebraicToSquare("a7"));
    expect(dests).toContain(algebraicToSquare("g7"));
  });
});

describe("Sliding blocking", () => {
  it("stops at the first occupied square within range, own piece blocks, enemy piece captures", () => {
    const state = buildState([
      { square: "d4", type: "rook", color: "white" },
      { square: "d6", type: "pawn", color: "white" }, // 2 away, own piece
      { square: "b4", type: "pawn", color: "black" }, // 2 away, enemy piece
    ]);
    const moves = generatePseudoLegalMoves(state, algebraicToSquare("d4"));
    const dests = destinations(moves);
    expect(dests).toContain(algebraicToSquare("d5")); // short of own blocker
    expect(dests).not.toContain(algebraicToSquare("d6")); // own piece square itself
    expect(dests).not.toContain(algebraicToSquare("d7")); // beyond own blocker
    expect(dests).toContain(algebraicToSquare("b4")); // capture enemy piece
    expect(dests).not.toContain(algebraicToSquare("a4")); // beyond captured enemy piece
  });
});
