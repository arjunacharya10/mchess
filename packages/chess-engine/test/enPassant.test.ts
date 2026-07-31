import { describe, expect, it } from "vitest";
import { algebraicToSquare } from "../src/board.js";
import { applyMove } from "../src/makeMove.js";
import { generatePseudoLegalMoves } from "../src/moveGen.js";
import { buildState } from "./testUtils.js";

describe("En passant", () => {
  it("allows capturing immediately after an adjacent double pawn push", () => {
    const state = buildState(
      [
        { square: "d4", type: "pawn", color: "white" },
        { square: "c4", type: "pawn", color: "black" },
      ],
      { sideToMove: "black", enPassantTarget: algebraicToSquare("d3") },
    );
    const moves = generatePseudoLegalMoves(state, algebraicToSquare("c4"));
    const epMove = moves.find((m) => m.isEnPassant);
    expect(epMove).toBeDefined();
    expect(epMove!.to).toBe(algebraicToSquare("d3"));

    const next = applyMove(state, epMove!);
    expect(next.board[algebraicToSquare("d4")]).toBeNull(); // captured pawn removed
    expect(next.board[algebraicToSquare("d3")]).toEqual({ type: "pawn", color: "black" });
  });

  it("is not available once the en passant window has passed", () => {
    const state = buildState(
      [
        { square: "d4", type: "pawn", color: "white" },
        { square: "c4", type: "pawn", color: "black" },
      ],
      { sideToMove: "black", enPassantTarget: null },
    );
    const moves = generatePseudoLegalMoves(state, algebraicToSquare("c4"));
    expect(moves.some((m) => m.isEnPassant)).toBe(false);
  });
});
