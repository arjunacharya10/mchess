import { useEffect } from "react";
import { useMatchmakingSocket } from "../hooks/useMatchmakingSocket.js";
import { getGuestName } from "../hooks/useLocalPlayerIdentity.js";
import { useSession } from "../hooks/useSession.js";
import { navigate } from "../lib/router.js";

export function MatchmakingPage() {
  const { user } = useSession();
  const displayName = user?.displayName ?? getGuestName();
  const { status, position, matchedGameId, cancel } = useMatchmakingSocket(true, displayName || undefined);

  useEffect(() => {
    if (matchedGameId) navigate(`/game/${matchedGameId}`);
  }, [matchedGameId]);

  return (
    <div className="matchmaking-page">
      <h1>Finding an opponent…</h1>
      {status === "queued" && <p>Waiting in queue{position ? ` (position ${position})` : ""}…</p>}
      <button
        type="button"
        onClick={() => {
          cancel();
          navigate("/");
        }}
      >
        Cancel
      </button>
    </div>
  );
}
