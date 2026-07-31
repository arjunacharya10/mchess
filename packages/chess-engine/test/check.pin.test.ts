import { describe, expect, it } from "vitest";
import { algebraicToSquare } from "../src/board.js";
import { isKingInCheck, getLegalMoves } from "../src/legalMoves.js";
import { generatePseudoLegalMoves } from "../src/moveGen.js";
import { buildState } from "./testUtils.js";

describe("Check respects the Rook/Bishop range cap", () => {
  it("is NOT in check from a rook 4 squares away on an open file (would be check in standard chess)", () => {
    const state = buildState([
      { square: "d1", type: "king", color: "white" },
      { square: "g7", type: "king", color: "black" },
      { square: "d5", type: "rook", color: "black" }, // 4 squares from d1
    ]);
    expect(isKingInCheck(state, "white")).toBe(false);
  });

  it("IS in check from a rook 3 squares away on an open file (within the cap)", () => {
    const state = buildState([
      { square: "d1", type: "king", color: "white" },
      { square: "g7", type: "king", color: "black" },
      { square: "d4", type: "rook", color: "black" }, // 3 squares from d1
    ]);
    expect(isKingInCheck(state, "white")).toBe(true);
  });

  it("does NOT pin a piece to a rook 4 squares beyond it (out of range even if the path were clear)", () => {
    const state = buildState([
      { square: "d1", type: "king", color: "white" },
      { square: "g7", type: "king", color: "black" },
      { square: "d2", type: "knight", color: "white" },
      { square: "d5", type: "rook", color: "black" }, // 4 away from king through d2
    ]);
    const pseudo = generatePseudoLegalMoves(state, algebraicToSquare("d2"));
    const legal = getLegalMoves(state, algebraicToSquare("d2"));
    expect(legal.length).toBe(pseudo.length);
  });

  it("DOES pin a piece to a rook 3 squares beyond it (within range)", () => {
    const state = buildState([
      { square: "d1", type: "king", color: "white" },
      { square: "g7", type: "king", color: "black" },
      { square: "d2", type: "knight", color: "white" },
      { square: "d4", type: "rook", color: "black" }, // 3 away from king through d2
    ]);
    const legal = getLegalMoves(state, algebraicToSquare("d2"));
    // A pinned knight has no legal moves: none of its L-shaped moves stay on the d-file.
    expect(legal.length).toBe(0);
  });
});
