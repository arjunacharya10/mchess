import { useEffect, useState } from "react";
import { getLobby, type PublicGame } from "../lib/api.js";

const POLL_INTERVAL_MS = 4000;

/** Polls the public lobby while mounted. Simple and fits the existing architecture — a
 * few seconds of staleness is an acceptable trade-off for not needing a push mechanism. */
export function usePublicLobby() {
  const [games, setGames] = useState<PublicGame[]>([]);

  useEffect(() => {
    let cancelled = false;

    function poll() {
      getLobby()
        .then((games) => {
          if (!cancelled) setGames(games);
        })
        .catch(() => {
          // Transient lobby fetch failures just mean the list stays stale until the next poll.
        });
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return games;
}
