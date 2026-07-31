import { describe, expect, it } from "vitest";
import { algebraicToSquare } from "../src/board.js";
import { getGameStatus } from "../src/gameStatus.js";
import { getLegalMoves } from "../src/legalMoves.js";
import { applyMove } from "../src/makeMove.js";
import type { GameState } from "../src/types.js";
import { buildState } from "./testUtils.js";

function move(state: GameState, from: string, to: string): GameState {
  const legal = getLegalMoves(state, algebraicToSquare(from));
  const chosen = legal.find((m) => m.to === algebraicToSquare(to));
  if (!chosen) throw new Error(`No legal move ${from}-${to} in this position`);
  return applyMove(state, chosen);
}

describe("Insufficient material", () => {
  it("is a draw with only two kings", () => {
    const state = buildState([
      { square: "a1", type: "king", color: "white" },
      { square: "g7", type: "king", color: "black" },
    ]);
    expect(getGameStatus(state).result).toBe("insufficient-material");
  });

  it("is a draw with king + single bishop vs king", () => {
    const state = buildState([
      { square: "a1", type: "king", color: "white" },
      { square: "g7", type: "king", color: "black" },
      { square: "c1", type: "bishop", color: "white" },
    ]);
    expect(getGameStatus(state).result).toBe("insufficient-material");
  });

  it("is a draw with opposite-colored kings' bishops on the same square color", () => {
    const state = buildState([
      { square: "a1", type: "king", color: "white" },
      { square: "g7", type: "king", color: "black" },
      { square: "c1", type: "bishop", color: "white" }, // dark square (file2+rank0=2, even)
      { square: "e1", type: "bishop", color: "black" }, // dark square (file4+rank0=4, even)
    ]);
    expect(getGameStatus(state).result).toBe("insufficient-material");
  });

  it("is NOT a draw with a rook on the board", () => {
    const state = buildState([
      { square: "a1", type: "king", color: "white" },
      { square: "g7", type: "king", color: "black" },
      { square: "c1", type: "rook", color: "white" },
    ]);
    expect(getGameStatus(state).result).not.toBe("insufficient-material");
  });
});

describe("Fifty-move rule", () => {
  it("is a draw once the halfmove clock reaches 100", () => {
    const state = buildState(
      [
        { square: "a1", type: "king", color: "white" },
        { square: "g7", type: "king", color: "black" },
        { square: "c1", type: "rook", color: "white" },
      ],
      { halfmoveClock: 100 },
    );
    expect(getGameStatus(state).result).toBe("fifty-move-rule");
  });
});

describe("Threefold repetition", () => {
  it("is a draw once the same position (with the same side to move) recurs three times", () => {
    let state = buildState([
      { square: "a1", type: "king", color: "white" },
      { square: "g7", type: "king", color: "black" },
      { square: "d4", type: "knight", color: "white" },
      { square: "d5", type: "knight", color: "black" },
    ]);

    // Shuffle both knights back and forth; after two full round-trips the starting
    // position (with white to move) will have occurred three times total.
    for (let i = 0; i < 2; i++) {
      state = move(state, "d4", "b3");
      state = move(state, "d5", "b6");
      state = move(state, "b3", "d4");
      state = move(state, "b6", "d5");
    }

    expect(getGameStatus(state).result).toBe("threefold-repetition");
  });
});
