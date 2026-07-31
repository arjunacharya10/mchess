import { describe, expect, it } from "vitest";
import { createInitialGameState } from "../src/setup.js";
import { algebraicToSquare } from "../src/board.js";

describe("createInitialGameState", () => {
  const state = createInitialGameState();

  it("places the back rank as R N B K B N R for both colors", () => {
    const expected = ["rook", "knight", "bishop", "king", "bishop", "knight", "rook"];
    const files = "abcdefg";
    files.split("").forEach((file, i) => {
      expect(state.board[algebraicToSquare(`${file}1`)]).toEqual({
        type: expected[i],
        color: "white",
      });
      expect(state.board[algebraicToSquare(`${file}7`)]).toEqual({
        type: expected[i],
        color: "black",
      });
    });
  });

  it("fills rank 2 and rank 6 entirely with pawns", () => {
    const files = "abcdefg";
    files.split("").forEach((file) => {
      expect(state.board[algebraicToSquare(`${file}2`)]).toEqual({ type: "pawn", color: "white" });
      expect(state.board[algebraicToSquare(`${file}6`)]).toEqual({ type: "pawn", color: "black" });
    });
  });

  it("has no queen anywhere on the board", () => {
    expect(state.board.some((p) => p?.type === "queen")).toBe(false);
  });

  it("starts with white to move", () => {
    expect(state.sideToMove).toBe("white");
  });
});
