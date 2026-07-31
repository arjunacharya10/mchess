import {
  serializeMove,
  type Color,
  type GameState,
  type GameStatus,
  type PieceType,
  type SerializedMove,
  type Square,
} from "@mchess/chess-engine";

/** Wire-friendly move description using the engine's numeric square indices directly. */
export interface LegalMoveWire {
  from: Square;
  to: Square;
  promotion?: PieceType;
}

/** GameState minus server-only bookkeeping (positionHistory) not needed by the client. */
export interface WireGameState {
  board: GameState["board"];
  sideToMove: Color;
  enPassantTarget: Square | null;
  halfmoveClock: number;
  fullmoveNumber: number;
  moveHistory: SerializedMove[];
}

export function toWireGameState(state: GameState): WireGameState {
  return {
    board: state.board,
    sideToMove: state.sideToMove,
    enPassantTarget: state.enPassantTarget,
    halfmoveClock: state.halfmoveClock,
    fullmoveNumber: state.fullmoveNumber,
    moveHistory: state.moveHistory.map(serializeMove),
  };
}

export type GameOverReason =
  | GameStatus["result"]
  | "resignation"
  | "draw-agreement"
  | "disconnect-timeout";

// ---- Game session (/ws/game/:id) ----

export type ClientGameMessage =
  | { type: "move"; from: Square; to: Square; promotion?: PieceType }
  | { type: "resign" }
  | { type: "offerDraw" }
  | { type: "respondDraw"; accept: boolean }
  | { type: "ping" };

export type ServerGameMessage =
  | {
      type: "state";
      /** null means the recipient is a read-only spectator, not a player. */
      yourColor: Color | null;
      gameState: WireGameState;
      status: GameStatus;
      legalMovesForYou: LegalMoveWire[];
    }
  | { type: "error"; code: string; message: string }
  | { type: "opponentConnected" }
  | { type: "opponentDisconnected"; gracePeriodMs: number }
  | { type: "drawOffered"; by: Color }
  | { type: "gameOver"; reason: GameOverReason; winner: Color | null }
  | { type: "pong" };

// ---- Matchmaking (/ws/matchmaking) ----

export type ClientMatchmakingMessage = { type: "cancel" };

export type ServerMatchmakingMessage =
  | { type: "queued"; position: number }
  | { type: "matched"; gameId: string; secret: string; color: Color };

/** Minimal shape both the browser WebSocket and Cloudflare's WebSocket implement. */
export interface JsonSendable {
  send(data: string): void;
}

export function sendJson(socket: JsonSendable, message: unknown): void {
  socket.send(JSON.stringify(message));
}

/** All messages in this protocol are sent as text (JSON) frames, never binary. */
export function parseJson<T>(data: string): T | null {
  try {
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}
