import { describe, expect, it } from "vitest";
import { getGameStatus } from "../src/gameStatus.js";
import { buildState } from "./testUtils.js";

describe("Checkmate detection", () => {
  it("detects a two-rook ladder mate against a cornered king", () => {
    // Black king cornered at a7. Rook at c7 checks along rank 7 (2 squares away, within
    // the 3-square cap) and also covers b7. Rook at c6 covers a6 and b6 (also in range).
    // All three flight squares from the a7 corner are covered; nothing can block/capture.
    const state = buildState(
      [
        { square: "a7", type: "king", color: "black" },
        { square: "g1", type: "king", color: "white" },
        { square: "c7", type: "rook", color: "white" },
        { square: "c6", type: "rook", color: "white" },
      ],
      { sideToMove: "black" },
    );
    const status = getGameStatus(state);
    expect(status.inCheck).toBe(true);
    expect(status.isGameOver).toBe(true);
    expect(status.result).toBe("checkmate");
    expect(status.winner).toBe("white");
  });
});

describe("Stalemate detection", () => {
  it("detects stalemate when the king has no legal moves but is not in check", () => {
    // Black king cornered at a7 (neighbors a6, b6, b7). White queen on c6 covers all
    // three via rank (a6), diagonal (b7), and adjacency (b6), but does not attack a7 itself.
    const state = buildState(
      [
        { square: "a7", type: "king", color: "black" },
        { square: "g1", type: "king", color: "white" },
        { square: "c6", type: "queen", color: "white" },
      ],
      { sideToMove: "black" },
    );
    const status = getGameStatus(state);
    expect(status.inCheck).toBe(false);
    expect(status.isGameOver).toBe(true);
    expect(status.result).toBe("stalemate");
    expect(status.winner).toBeNull();
  });
});
