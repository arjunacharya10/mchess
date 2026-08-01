import { useEffect } from "react";
import { useMatchmakingSocket } from "../hooks/useMatchmakingSocket.js";
import { getGuestName } from "../hooks/useLocalPlayerIdentity.js";
import { useSession } from "../hooks/useSession.js";
import { navigate } from "../lib/router.js";

export function MatchmakingPage() {
  const { user, loading } = useSession();
  const guestName = getGuestName();
  const displayName = user?.displayName ?? guestName;
  const canProceed = Boolean(user) || guestName.trim().length > 0;

  useEffect(() => {
    // Defensive guard for direct navigation to this URL (the Home page already
    // disables the "Quick match" button until a name is set).
    if (!loading && !canProceed) navigate("/");
  }, [loading, canProceed]);

  const { status, position, matchedGameId, cancel } = useMatchmakingSocket(canProceed, displayName || undefined);

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
