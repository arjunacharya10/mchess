import { useEffect, useState } from "react";
import { getMyGames, removeMyGame } from "../hooks/useLocalPlayerIdentity.js";
import { getRoomStatus } from "../lib/api.js";
import { navigate } from "../lib/router.js";

/**
 * Signed-in users: `accountCurrentGameId` (from /api/me) is the source of truth — it
 * works across devices/browsers. Guests: falls back to the most-recently-added entry
 * in the local `mchess:myGames` index (only that one is status-checked, to avoid an
 * N-request fan-out for older, possibly-finished games).
 */
export function OngoingMatchBanner({ accountCurrentGameId }: { accountCurrentGameId?: string | null }) {
  const [resumableGameId, setResumableGameId] = useState<string | null>(null);

  useEffect(() => {
    if (accountCurrentGameId) {
      setResumableGameId(accountCurrentGameId);
      return;
    }

    const games = getMyGames();
    const mostRecent = games[games.length - 1];
    if (!mostRecent) return;

    getRoomStatus(mostRecent.gameId)
      .then((status) => {
        if (status.status === "completed") {
          removeMyGame(mostRecent.gameId);
        } else {
          setResumableGameId(mostRecent.gameId);
        }
      })
      .catch(() => removeMyGame(mostRecent.gameId));
  }, [accountCurrentGameId]);

  if (!resumableGameId) return null;

  return (
    <section className="ongoing-match-banner">
      <span>You have a game in progress.</span>
      <button type="button" onClick={() => navigate(`/game/${resumableGameId}`)}>
        Resume
      </button>
    </section>
  );
}
