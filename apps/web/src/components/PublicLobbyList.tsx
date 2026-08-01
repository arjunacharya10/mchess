import { useState } from "react";
import type { PublicGame } from "../lib/api.js";
import { joinRoom } from "../lib/api.js";
import { storeSecret } from "../hooks/useLocalPlayerIdentity.js";
import { navigate } from "../lib/router.js";

export function PublicLobbyList({ games }: { games: PublicGame[] }) {
  const [error, setError] = useState<string | null>(null);

  async function handleJoin(gameId: string) {
    setError(null);
    try {
      const creds = await joinRoom(gameId);
      storeSecret(gameId, creds.secret);
      navigate(`/game/${gameId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not join that game");
    }
  }

  if (games.length === 0) {
    return (
      <section className="lobby-section">
        <h2>Public games</h2>
        <p>No public games right now.</p>
      </section>
    );
  }

  return (
    <section className="lobby-section">
      <h2>Public games</h2>
      {error && <p className="error-text">{error}</p>}
      <ul className="lobby-list">
        {games.map((game) => (
          <li key={game.gameId}>
            <span>
              {game.whiteDisplayName ?? "Player 1"}
              {game.blackDisplayName ? ` vs ${game.blackDisplayName}` : " (waiting for opponent)"}
            </span>
            {/* A room can already be full (both players assigned via /join) before its
                status flips to "in-progress" (that only happens once both sides actually
                connect over WebSocket) — key off blackDisplayName, not status, so a full
                room offers Watch instead of a Join that would 409. */}
            {!game.blackDisplayName ? (
              <button type="button" onClick={() => handleJoin(game.gameId)}>
                Join
              </button>
            ) : (
              <button type="button" onClick={() => navigate(`/watch/${game.gameId}`)}>
                Watch
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
