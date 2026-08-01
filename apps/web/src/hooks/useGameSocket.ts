import { useCallback, useEffect, useRef, useState } from "react";
import type { Color, GameStatus, PieceType } from "@mchess/chess-engine";
import {
  parseJson,
  sendJson,
  type ClientGameMessage,
  type GameOverReason,
  type LegalMoveWire,
  type ServerGameMessage,
  type WireGameState,
} from "@mchess/protocol";

export interface GameSocketState {
  connectionStatus: "connecting" | "open" | "closed";
  yourColor: Color | null;
  gameState: WireGameState | null;
  status: GameStatus | null;
  legalMovesForYou: LegalMoveWire[];
  opponentConnected: boolean;
  drawOfferFrom: Color | null;
  gameOver: { reason: GameOverReason; winner: Color | null } | null;
  lastError: string | null;
}

const INITIAL_STATE: GameSocketState = {
  connectionStatus: "connecting",
  yourColor: null,
  gameState: null,
  status: null,
  legalMovesForYou: [],
  opponentConnected: false,
  drawOfferFrom: null,
  gameOver: null,
  lastError: null,
};

const MAX_BACKOFF_MS = 10_000;

export type GameSocketMode = { mode: "player"; secret: string } | { mode: "spectator" };

/** Owns the WebSocket lifecycle (with reconnect/backoff) for a single game room. */
export function useGameSocket(gameId: string, connection: GameSocketMode | null) {
  const [state, setState] = useState<GameSocketState>(INITIAL_STATE);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!connection) return;
    const activeConnection = connection;

    let cancelled = false;
    let attempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    function applyMessage(message: ServerGameMessage) {
      switch (message.type) {
        case "state":
          setState((s) => ({
            ...s,
            yourColor: message.yourColor,
            gameState: message.gameState,
            status: message.status,
            legalMovesForYou: message.legalMovesForYou,
            drawOfferFrom: null,
          }));
          break;
        case "opponentConnected":
          setState((s) => ({ ...s, opponentConnected: true }));
          break;
        case "opponentDisconnected":
          setState((s) => ({ ...s, opponentConnected: false }));
          break;
        case "drawOffered":
          setState((s) => ({ ...s, drawOfferFrom: message.by }));
          break;
        case "gameOver":
          setState((s) => ({ ...s, gameOver: { reason: message.reason, winner: message.winner } }));
          break;
        case "error":
          setState((s) => ({ ...s, lastError: message.message }));
          break;
        case "pong":
          break;
      }
    }

    function connect() {
      if (cancelled) return;
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const query = activeConnection.mode === "player" ? `secret=${activeConnection.secret}` : "spectate=1";
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws/game/${gameId}?${query}`);
      wsRef.current = ws;

      ws.addEventListener("open", () => {
        attempt = 0;
        setState((s) => ({ ...s, connectionStatus: "open" }));
      });

      ws.addEventListener("message", (event) => {
        const message = parseJson<ServerGameMessage>(event.data);
        if (message) applyMessage(message);
      });

      ws.addEventListener("close", () => {
        if (cancelled) return;
        setState((s) => ({ ...s, connectionStatus: "closed" }));
        const delay = Math.min(1000 * 2 ** attempt, MAX_BACKOFF_MS);
        attempt += 1;
        reconnectTimer = setTimeout(connect, delay);
      });
    }

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
    // Re-connect only when the game or the resolved connection identity actually changes,
    // not on every render (callers may pass a fresh `connection` object literal each time).
  }, [gameId, connection ? (connection.mode === "player" ? connection.secret : "spectator") : null]);

  const send = useCallback((message: ClientGameMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      sendJson(wsRef.current, message);
    }
  }, []);

  const sendMove = useCallback(
    (from: number, to: number, promotion?: PieceType) => send({ type: "move", from, to, promotion }),
    [send],
  );
  const resign = useCallback(() => send({ type: "resign" }), [send]);
  const offerDraw = useCallback(() => send({ type: "offerDraw" }), [send]);
  const respondDraw = useCallback((accept: boolean) => send({ type: "respondDraw", accept }), [send]);
  const cancelWaiting = useCallback(() => send({ type: "cancelWaiting" }), [send]);

  return { ...state, sendMove, resign, offerDraw, respondDraw, cancelWaiting };
}
