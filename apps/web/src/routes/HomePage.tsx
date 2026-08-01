import { useState } from "react";
import { AccountBadge } from "../components/AccountBadge.js";
import { MatchHistoryList } from "../components/MatchHistoryList.js";
import { OngoingMatchBanner } from "../components/OngoingMatchBanner.js";
import { PublicLobbyList } from "../components/PublicLobbyList.js";
import { usePublicLobby } from "../hooks/usePublicLobby.js";
import { useSession } from "../hooks/useSession.js";
import { addMyGame, getGuestName, setGuestName, storeSecret } from "../hooks/useLocalPlayerIdentity.js";
import { createRoom } from "../lib/api.js";
import { navigate } from "../lib/router.js";

export function HomePage() {
  const { user, loading, signOut } = useSession();
  const [guestName, setGuestNameState] = useState(getGuestName());
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState<"private" | "public" | null>(null);
  const lobbyGames = usePublicLobby();

  const displayName = user?.displayName ?? guestName;
  const canStart = Boolean(user) || guestName.trim().length > 0;

  function handleGuestNameChange(value: string) {
    setGuestNameState(value);
    setGuestName(value);
  }

  async function handleCreate(isPublic: boolean) {
    setCreating(isPublic ? "public" : "private");
    setError(null);
    try {
      const { gameId, secret } = await createRoom(displayName || undefined, isPublic);
      storeSecret(gameId, secret);
      addMyGame(gameId);
      navigate(`/game/${gameId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create game");
    } finally {
      setCreating(null);
    }
  }

  return (
    <div className="home-page">
      <AccountBadge user={user} loading={loading} onSignOut={signOut} />
      <h1>7x7 Chess</h1>
      <p>
        A chess variant on a 7x7 board: no queens in the starting position, no castling, and
        Rooks/Bishops slide at most 3 squares. All other rules are standard.
      </p>

      {!user && (
        <label className="guest-name-field">
          Your name
          <input
            type="text"
            value={guestName}
            placeholder="Guest"
            maxLength={32}
            onChange={(e) => handleGuestNameChange(e.target.value)}
          />
        </label>
      )}
      {!canStart && <p className="hint-text">Enter a name to start playing.</p>}

      <div className="home-actions">
        <button type="button" onClick={() => handleCreate(false)} disabled={creating !== null || !canStart}>
          Create private game
        </button>
        <button type="button" onClick={() => handleCreate(true)} disabled={creating !== null || !canStart}>
          Create public game
        </button>
        <button type="button" onClick={() => navigate("/matchmaking")} disabled={!canStart}>
          Quick match
        </button>
      </div>
      {error && <p className="error-text">{error}</p>}

      <OngoingMatchBanner accountCurrentGameId={user?.currentGameId} />
      <PublicLobbyList games={lobbyGames} />
      {user && <MatchHistoryList />}
    </div>
  );
}
