import { useMemo, useState } from "react";
import {
  applyMove,
  createInitialGameState,
  getAllLegalMoves,
  getGameStatus,
  getLegalMoves,
  type GameState,
  type GameStatus,
  type PieceType,
} from "@mchess/chess-engine";
import { toWireGameState } from "@mchess/protocol";
import { Board } from "../components/Board.js";
import { MoveHistoryList } from "../components/MoveHistoryList.js";
import { navigate } from "../lib/router.js";

function describeSoloGameOver(status: GameStatus): string {
  if (status.result === "checkmate") {
    return `Checkmate — ${status.winner === "white" ? "White" : "Black"} wins.`;
  }
  const reasonText: Record<string, string> = {
    stalemate: "Stalemate.",
    "insufficient-material": "Draw by insufficient material.",
    "threefold-repetition": "Draw by threefold repetition.",
    "fifty-move-rule": "Draw by the fifty-move rule.",
  };
  return reasonText[status.result ?? ""] ?? "Game over.";
}

/**
 * Entirely local pass-and-play: one person plays both sides on the same device, no
 * server/network involved at all — the rules engine already runs client-side for move
 * highlighting, so it's reused directly here instead of going through a GameSession.
 */
export function SoloPage() {
  const [gameState, setGameState] = useState<GameState>(() => createInitialGameState());

  const wireState = useMemo(() => toWireGameState(gameState), [gameState]);
  const status = useMemo(() => getGameStatus(gameState), [gameState]);
  const legalMovesForYou = useMemo(
    () => getAllLegalMoves(gameState).map((m) => ({ from: m.from, to: m.to, promotion: m.promotion })),
    [gameState],
  );

  function handleMove(from: number, to: number, promotion?: PieceType) {
    const chosen = getLegalMoves(gameState, from).find((m) => m.to === to && m.promotion === promotion);
    if (chosen) setGameState((current) => applyMove(current, chosen));
  }

  return (
    <div className="room-page">
      {status.isGameOver ? (
        <div className="status-banner status-banner-over">{describeSoloGameOver(status)}</div>
      ) : (
        <div className="status-banner">
          <span>Playing against yourself</span>
          <span>{gameState.sideToMove === "white" ? "White" : "Black"} to move</span>
          {status.inCheck && <span className="status-check">Check!</span>}
        </div>
      )}
      <Board
        gameState={wireState}
        yourColor={gameState.sideToMove}
        legalMovesForYou={legalMovesForYou}
        onMove={handleMove}
      />
      <MoveHistoryList moveHistory={wireState.moveHistory} />
      <div className="home-actions">
        <button type="button" onClick={() => setGameState(createInitialGameState())}>
          New game
        </button>
        <button type="button" onClick={() => navigate("/")}>
          Back home
        </button>
      </div>
    </div>
  );
}
