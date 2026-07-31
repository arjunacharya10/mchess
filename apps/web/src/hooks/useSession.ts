import { useCallback, useEffect, useState } from "react";
import { getMe, logout, type SessionInfo } from "../lib/api.js";

export function useSession() {
  const [session, setSession] = useState<SessionInfo | null>(null);

  const refresh = useCallback(() => {
    getMe()
      .then(setSession)
      .catch(() => setSession({ signedIn: false }));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    await logout();
    refresh();
  }, [refresh]);

  return {
    loading: session === null,
    user: session && session.signedIn ? session.user : null,
    signOut,
  };
}
