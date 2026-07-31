import { useEffect, useState } from "react";
import { Board } from "../components/Board.js";
import { GameStatusBanner } from "../components/GameStatusBanner.js";
import { MoveHistoryList } from "../components/MoveHistoryList.js";
import { useGameSocket } from "../hooks/useGameSocket.js";
import { addMyGame, getStoredSecret, storeSecret } from "../hooks/useLocalPlayerIdentity.js";
import { joinRoom } from "../lib/api.js";
import { navigate } from "../lib/router.js";

export function RoomPage({ gameId }: { gameId: string }) {
  const [secret, setSecret] = useState<string | null>(() => getStoredSecret(gameId));
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    if (secret) return;
    joinRoom(gameId)
      .then((creds) => {
        storeSecret(gameId, creds.secret);
        addMyGame(gameId);
        setSecret(creds.secret);
      })
      .catch((e) => setJoinError(e instanceof Error ? e.message : "Could not join this game"));
  }, [gameId, secret]);

  const game = useGameSocket(gameId, secret ? { mode: "player", secret } : null);

  if (joinError) {
    return (
      <div className="room-page">
        <p className="error-text">{joinError}</p>
        <button type="button" onClick={() => navigate("/")}>
          Back home
        </button>
      </div>
    );
  }

  if (!secret || !game.gameState || !game.yourColor) {
    return <div className="room-page">Connecting…</div>;
  }

  const shareUrl = `${window.location.origin}/game/${gameId}`;

  return (
    <div className="room-page">
      {!game.gameOver && !game.opponentConnected && (
        <p className="share-link">
          Share this link with your opponent: <code>{shareUrl}</code>
        </p>
      )}
      <GameStatusBanner
        yourColor={game.yourColor}
        status={game.status}
        opponentConnected={game.opponentConnected}
        drawOfferFrom={game.drawOfferFrom}
        gameOver={game.gameOver}
        onResign={game.resign}
        onOfferDraw={game.offerDraw}
        onRespondDraw={game.respondDraw}
      />
      <Board
        gameState={game.gameState}
        yourColor={game.yourColor}
        legalMovesForYou={game.legalMovesForYou}
        onMove={game.sendMove}
      />
      <MoveHistoryList moveHistory={game.gameState.moveHistory} />
    </div>
  );
}
