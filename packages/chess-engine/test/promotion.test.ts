import { describe, expect, it } from "vitest";
import { algebraicToSquare } from "../src/board.js";
import { applyMove } from "../src/makeMove.js";
import { generatePseudoLegalMoves } from "../src/moveGen.js";
import { buildState } from "./testUtils.js";

describe("Promotion", () => {
  it("offers all four promotion choices when a pawn reaches the final rank", () => {
    const state = buildState([{ square: "d6", type: "pawn", color: "white" }]);
    const moves = generatePseudoLegalMoves(state, algebraicToSquare("d6"));
    const promotions = moves.filter((m) => m.to === algebraicToSquare("d7")).map((m) => m.promotion);
    expect(promotions.sort()).toEqual(["bishop", "knight", "queen", "rook"].sort());
  });

  it("a promoted queen has unlimited sliding range, unlike the bishop/rook it can replace", () => {
    const state = buildState([{ square: "d6", type: "pawn", color: "white" }]);
    const promoMove = generatePseudoLegalMoves(state, algebraicToSquare("d6")).find(
      (m) => m.to === algebraicToSquare("d7") && m.promotion === "queen",
    )!;
    const next = applyMove(state, promoMove);
    const queenMoves = generatePseudoLegalMoves(next, algebraicToSquare("d7"));
    expect(queenMoves.map((m) => m.to)).toContain(algebraicToSquare("a7"));
  });
});
