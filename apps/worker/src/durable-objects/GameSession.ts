import {
  applyMove,
  createInitialGameState,
  getAllLegalMoves,
  getGameStatus,
  getLegalMoves,
  otherColor,
  serializeMove,
  type Color,
  type GameState as EngineGameState,
  type PieceType,
} from "@mchess/chess-engine";
import {
  parseJson,
  sendJson,
  toWireGameState,
  type ClientGameMessage,
  type GameOverReason,
  type ServerGameMessage,
} from "@mchess/protocol";
import { TRUSTED_USER_ID_HEADER } from "../auth/requestUser.js";
import { archiveGame } from "../db/archiveGame.js";
import {
  deletePublicGame,
  insertPublicGame,
  updatePublicGameOnJoin,
  updatePublicGameStatus,
} from "../db/publicGames.js";
import { applyRatingUpdates } from "../db/rating.js";
import { setCurrentGameId } from "../db/users.js";
import type { Env } from "../env.js";
import { generateSecret } from "../utils/ids.js";

const DISCONNECT_GRACE_PERIOD_MS = 5 * 60 * 1000;
const STORAGE_KEY = "session";

interface PlayerSlot {
  userId?: string;
  displayName: string;
  secret: string;
  connected: boolean;
  disconnectedAt: number | null;
}

type SessionStatus = "waiting-for-opponent" | "in-progress" | "completed";

interface SessionState {
  gameId: string;
  players: { white: PlayerSlot | null; black: PlayerSlot | null };
  status: SessionStatus;
  /** Set once at creation. Only public games appear in the lobby or accept spectators. */
  visibility: "private" | "public";
  gameState: EngineGameState;
  drawOfferBy: Color | null;
  result: { winner: Color | null; reason: GameOverReason } | null;
  createdAt: number;
  lastMoveAt: number;
}

export class GameSession implements DurableObject {
  private session: SessionState | null = null;

  constructor(
    private readonly ctx: DurableObjectState,
    private readonly env: Env,
  ) {}

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") === "websocket") {
      return this.handleConnect(request);
    }
    const url = new URL(request.url);
    if (url.pathname === "/init" && request.method === "POST") return this.handleInit(request);
    if (url.pathname === "/join" && request.method === "POST") return this.handleJoin(request);
    if (url.pathname === "/status" && request.method === "GET") return this.handleStatus();
    return new Response("Not found", { status: 404 });
  }

  private async handleStatus(): Promise<Response> {
    const session = await this.ctx.storage.get<SessionState>(STORAGE_KEY);
    if (!session) return Response.json({ error: "not-found" }, { status: 404 });
    return Response.json({
      status: session.status,
      visibility: session.visibility,
      whiteDisplayName: session.players.white?.displayName ?? null,
      blackDisplayName: session.players.black?.displayName ?? null,
    });
  }

  // ---- HTTP: room creation / joining ----

  private async handleInit(request: Request): Promise<Response> {
    const existing = await this.ctx.storage.get<SessionState>(STORAGE_KEY);
    if (existing) return Response.json({ error: "already-initialized" }, { status: 409 });

    const body = (await request.json()) as {
      gameId: string;
      displayName?: string;
      userId?: string;
      isPublic?: boolean;
    };
    const secret = generateSecret();
    const session: SessionState = {
      gameId: body.gameId,
      players: {
        white: {
          displayName: body.displayName ?? "Player 1",
          userId: body.userId,
          secret,
          connected: false,
          disconnectedAt: null,
        },
        black: null,
      },
      status: "waiting-for-opponent",
      visibility: body.isPublic ? "public" : "private",
      gameState: createInitialGameState(),
      drawOfferBy: null,
      result: null,
      createdAt: Date.now(),
      lastMoveAt: Date.now(),
    };
    await this.saveSession(session);
    if (session.visibility === "public") {
      await insertPublicGame(this.env, session.gameId, session.players.white!.displayName, body.userId);
    }
    if (body.userId) {
      this.ctx.waitUntil(setCurrentGameId(this.env, body.userId, session.gameId));
    }
    return Response.json({ gameId: session.gameId, secret, color: "white" });
  }

  private async handleJoin(request: Request): Promise<Response> {
    const session = await this.ctx.storage.get<SessionState>(STORAGE_KEY);
    if (!session) return Response.json({ error: "not-found" }, { status: 404 });
    if (session.players.black) return Response.json({ error: "room-full" }, { status: 409 });

    const body = (await request.json().catch(() => ({}))) as { displayName?: string; userId?: string };
    const secret = generateSecret();
    session.players.black = {
      displayName: body.displayName ?? "Player 2",
      userId: body.userId,
      secret,
      connected: false,
      disconnectedAt: null,
    };
    await this.saveSession(session);
    if (session.visibility === "public") {
      await updatePublicGameOnJoin(this.env, session.gameId, session.players.black.displayName, body.userId);
    }
    if (body.userId) {
      this.ctx.waitUntil(setCurrentGameId(this.env, body.userId, session.gameId));
    }
    return Response.json({ gameId: session.gameId, secret, color: "black" });
  }

  // ---- WebSocket lifecycle ----

  private async handleConnect(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const secret = url.searchParams.get("secret");
    const trustedUserId = request.headers.get(TRUSTED_USER_ID_HEADER);
    const isSpectateRequest = url.searchParams.get("spectate") === "1";
    const session = await this.ctx.storage.get<SessionState>(STORAGE_KEY);
    if (!session) return new Response("Not found", { status: 404 });

    if (isSpectateRequest) {
      if (session.visibility !== "public") return new Response("Not spectatable", { status: 403 });
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      this.ctx.acceptWebSocket(server, ["spectator"]);
      this.sendState(server, session, null);
      return new Response(null, { status: 101, webSocket: client });
    }

    const color = secret ? this.colorForSecret(session, secret) : trustedUserId ? this.colorForUserId(session, trustedUserId) : null;
    if (!color) return new Response("Invalid credentials", { status: 403 });

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server, [color]);

    const slot = session.players[color]!;
    slot.connected = true;
    slot.disconnectedAt = null;
    const justStarted = session.status === "waiting-for-opponent" && session.players.white?.connected && session.players.black?.connected;
    if (justStarted) {
      session.status = "in-progress";
    }
    await this.saveSession(session);
    await this.recomputeAlarm(session);
    if (justStarted && session.visibility === "public") {
      this.ctx.waitUntil(updatePublicGameStatus(this.env, session.gameId, "in-progress"));
    }

    this.sendState(server, session, color);
    this.sendToColor(session, otherColor(color), { type: "opponentConnected" });

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== "string") return;
    const parsed = parseJson<ClientGameMessage>(message);
    if (!parsed) return;

    const session = await this.loadSession();
    const color = this.colorForSocket(ws);
    if (!color) return;

    switch (parsed.type) {
      case "move":
        await this.handleMove(session, color, ws, parsed.from, parsed.to, parsed.promotion);
        break;
      case "resign":
        await this.handleResign(session, color);
        break;
      case "offerDraw":
        await this.handleOfferDraw(session, color);
        break;
      case "respondDraw":
        await this.handleRespondDraw(session, color, parsed.accept);
        break;
      case "ping":
        sendJson(ws, { type: "pong" });
        break;
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const session = await this.loadSession().catch(() => null);
    const color = this.colorForSocket(ws);
    if (!session || !color) return;

    const slot = session.players[color];
    if (!slot) return;
    slot.connected = false;
    slot.disconnectedAt = Date.now();
    await this.saveSession(session);
    await this.recomputeAlarm(session);

    this.sendToColor(session, otherColor(color), {
      type: "opponentDisconnected",
      gracePeriodMs: DISCONNECT_GRACE_PERIOD_MS,
    });
  }

  async alarm(): Promise<void> {
    const session = await this.loadSession().catch(() => null);
    if (!session || session.status !== "in-progress") return;

    const now = Date.now();
    const timedOut: Color[] = (["white", "black"] as const).filter((color) => {
      const slot = session.players[color];
      return slot && !slot.connected && slot.disconnectedAt !== null && now - slot.disconnectedAt >= DISCONNECT_GRACE_PERIOD_MS;
    });

    if (timedOut.length === 0) {
      await this.recomputeAlarm(session);
      return;
    }

    if (timedOut.length === 2) {
      await this.endGame(session, null, "disconnect-timeout");
    } else {
      await this.endGame(session, otherColor(timedOut[0]), "disconnect-timeout");
    }
  }

  // ---- Message handlers ----

  private async handleMove(
    session: SessionState,
    color: Color,
    ws: WebSocket,
    from: number,
    to: number,
    promotion?: PieceType,
  ): Promise<void> {
    if (session.status !== "in-progress") {
      sendJson(ws, { type: "error", code: "not-in-progress", message: "Game is not in progress." });
      return;
    }
    if (session.gameState.sideToMove !== color) {
      sendJson(ws, { type: "error", code: "not-your-turn", message: "It is not your turn." });
      return;
    }

    const legalMoves = getLegalMoves(session.gameState, from);
    const chosen = legalMoves.find((m) => m.to === to && m.promotion === promotion);
    if (!chosen) {
      sendJson(ws, { type: "error", code: "illegal-move", message: "That move is not legal." });
      return;
    }

    session.gameState = applyMove(session.gameState, chosen);
    session.lastMoveAt = Date.now();
    session.drawOfferBy = null;
    await this.saveSession(session);

    const status = getGameStatus(session.gameState);
    if (status.isGameOver) {
      await this.endGame(session, status.winner, status.result ?? "checkmate");
    } else {
      this.broadcastState(session);
    }
  }

  private async handleResign(session: SessionState, color: Color): Promise<void> {
    if (session.status !== "in-progress") return;
    await this.endGame(session, otherColor(color), "resignation");
  }

  private async handleOfferDraw(session: SessionState, color: Color): Promise<void> {
    if (session.status !== "in-progress" || session.drawOfferBy) return;
    session.drawOfferBy = color;
    await this.saveSession(session);
    const message: ServerGameMessage = { type: "drawOffered", by: color };
    this.sendToColor(session, "white", message);
    this.sendToColor(session, "black", message);
  }

  private async handleRespondDraw(session: SessionState, color: Color, accept: boolean): Promise<void> {
    if (session.status !== "in-progress" || !session.drawOfferBy || session.drawOfferBy === color) return;
    if (accept) {
      await this.endGame(session, null, "draw-agreement");
    } else {
      session.drawOfferBy = null;
      await this.saveSession(session);
      this.broadcastState(session);
    }
  }

  // ---- Shared helpers ----

  private async endGame(session: SessionState, winner: Color | null, reason: GameOverReason): Promise<void> {
    session.status = "completed";
    session.result = { winner, reason };
    await this.saveSession(session);
    await this.ctx.storage.deleteAlarm();

    const message: ServerGameMessage = { type: "gameOver", reason, winner };
    this.sendToColor(session, "white", message);
    this.sendToColor(session, "black", message);

    this.ctx.waitUntil(
      archiveGame(this.env, {
        gameId: session.gameId,
        whiteUserId: session.players.white?.userId,
        blackUserId: session.players.black?.userId,
        whiteDisplayName: session.players.white?.displayName ?? "Player 1",
        blackDisplayName: session.players.black?.displayName ?? "Player 2",
        result: winner === "white" ? "white" : winner === "black" ? "black" : "draw",
        resultReason: reason ?? "unknown",
        moveLog: session.gameState.moveHistory.map(serializeMove),
        startedAt: session.createdAt,
        endedAt: Date.now(),
      }),
    );

    if (session.visibility === "public") {
      this.ctx.waitUntil(deletePublicGame(this.env, session.gameId));
    }

    this.ctx.waitUntil(
      applyRatingUpdates(this.env, session.players.white?.userId, session.players.black?.userId, winner),
    );

    for (const player of [session.players.white, session.players.black]) {
      if (player?.userId) this.ctx.waitUntil(setCurrentGameId(this.env, player.userId, null));
    }
  }

  private broadcastState(session: SessionState): void {
    this.sendState(this.socketFor("white"), session, "white");
    this.sendState(this.socketFor("black"), session, "black");
    // Unlike white/black (exactly one socket each), there can be any number of spectators.
    for (const ws of this.ctx.getWebSockets("spectator")) {
      this.sendState(ws, session, null);
    }
  }

  private sendState(ws: WebSocket | undefined, session: SessionState, color: Color | null): void {
    if (!ws) return;
    const status = getGameStatus(session.gameState);
    const legalMovesForYou =
      color !== null && session.gameState.sideToMove === color
        ? getAllLegalMoves(session.gameState).map((m) => ({ from: m.from, to: m.to, promotion: m.promotion }))
        : [];
    const message: ServerGameMessage = {
      type: "state",
      yourColor: color,
      gameState: toWireGameState(session.gameState),
      status,
      legalMovesForYou,
    };
    sendJson(ws, message);
  }

  private sendToColor(session: SessionState, color: Color, message: ServerGameMessage): void {
    const ws = this.socketFor(color);
    if (ws) sendJson(ws, message);
  }

  private socketFor(color: Color): WebSocket | undefined {
    return this.ctx.getWebSockets(color)[0];
  }

  private colorForSocket(ws: WebSocket): Color | null {
    const tags = this.ctx.getTags(ws);
    if (tags.includes("white")) return "white";
    if (tags.includes("black")) return "black";
    return null;
  }

  private colorForSecret(session: SessionState, secret: string): Color | null {
    if (session.players.white?.secret === secret) return "white";
    if (session.players.black?.secret === secret) return "black";
    return null;
  }

  private colorForUserId(session: SessionState, userId: string): Color | null {
    if (session.players.white?.userId === userId) return "white";
    if (session.players.black?.userId === userId) return "black";
    return null;
  }

  private async recomputeAlarm(session: SessionState): Promise<void> {
    if (session.status !== "in-progress") {
      await this.ctx.storage.deleteAlarm();
      return;
    }
    const deadlines = (["white", "black"] as const)
      .map((color) => session.players[color]?.disconnectedAt)
      .filter((d): d is number => d !== null && d !== undefined)
      .map((d) => d + DISCONNECT_GRACE_PERIOD_MS);

    if (deadlines.length === 0) {
      await this.ctx.storage.deleteAlarm();
    } else {
      await this.ctx.storage.setAlarm(Math.min(...deadlines));
    }
  }

  private async loadSession(): Promise<SessionState> {
    if (this.session) return this.session;
    const stored = await this.ctx.storage.get<SessionState>(STORAGE_KEY);
    if (!stored) throw new Error("GameSession not initialized");
    this.session = stored;
    return stored;
  }

  private async saveSession(session: SessionState): Promise<void> {
    this.session = session;
    await this.ctx.storage.put(STORAGE_KEY, session);
  }
}
