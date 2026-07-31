import { useEffect, useRef, useState } from "react";
import { parseJson, type ServerMatchmakingMessage } from "@mchess/protocol";
import { addMyGame, storeSecret } from "./useLocalPlayerIdentity.js";

export interface MatchmakingState {
  status: "connecting" | "queued" | "matched";
  position: number | null;
  matchedGameId: string | null;
}

/** Opens the matchmaking queue socket and reports back once paired into a game. */
export function useMatchmakingSocket(enabled: boolean, displayName?: string) {
  const [state, setState] = useState<MatchmakingState>({
    status: "connecting",
    position: null,
    matchedGameId: null,
  });
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const query = displayName ? `?displayName=${encodeURIComponent(displayName)}` : "";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/matchmaking${query}`);
    wsRef.current = ws;

    ws.addEventListener("message", (event) => {
      const message = parseJson<ServerMatchmakingMessage>(event.data);
      if (!message) return;
      if (message.type === "queued") {
        setState({ status: "queued", position: message.position, matchedGameId: null });
      } else if (message.type === "matched") {
        storeSecret(message.gameId, message.secret);
        addMyGame(message.gameId);
        setState({ status: "matched", position: null, matchedGameId: message.gameId });
      }
    });

    return () => {
      wsRef.current = null;
      ws.close();
    };
  }, [enabled]);

  const cancel = () => wsRef.current?.close();

  return { ...state, cancel };
}
