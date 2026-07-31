import { useMemo } from "react";
import { Board } from "../components/Board.js";
import { GameStatusBanner } from "../components/GameStatusBanner.js";
import { MoveHistoryList } from "../components/MoveHistoryList.js";
import { useGameSocket, type GameSocketMode } from "../hooks/useGameSocket.js";
import { navigate } from "../lib/router.js";

const SPECTATOR_MODE: GameSocketMode = { mode: "spectator" };

export function SpectatePage({ gameId }: { gameId: string }) {
  const connection = useMemo(() => SPECTATOR_MODE, []);
  const game = useGameSocket(gameId, connection);

  if (!game.gameState) {
    return <div className="room-page">Connecting…</div>;
  }

  return (
    <div className="room-page">
      <p className="share-link">Spectating</p>
      <GameStatusBanner
        yourColor={null}
        status={game.status}
        opponentConnected={game.opponentConnected}
        drawOfferFrom={game.drawOfferFrom}
        gameOver={game.gameOver}
        onResign={() => {}}
        onOfferDraw={() => {}}
        onRespondDraw={() => {}}
        spectator
      />
      <Board gameState={game.gameState} yourColor={null} legalMovesForYou={[]} onMove={() => {}} />
      <MoveHistoryList moveHistory={game.gameState.moveHistory} />
      <button type="button" onClick={() => navigate("/")}>
        Back home
      </button>
    </div>
  );
}
