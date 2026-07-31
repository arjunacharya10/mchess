import { parseJson, sendJson, type ClientMatchmakingMessage, type ServerMatchmakingMessage } from "@mchess/protocol";
import { TRUSTED_USER_ID_HEADER } from "../auth/requestUser.js";
import type { Env } from "../env.js";
import { generateId } from "../utils/ids.js";

const QUEUE_KEY = "queue";

interface QueueEntry {
  playerId: string;
  displayName?: string;
  userId?: string;
}

/**
 * Singleton Durable Object (always addressed via idFromName("global")) that pairs
 * waiting players FIFO. A DO gives free single-threaded serialization for the
 * "check queue, pop, create game" sequence, avoiding KV's eventual-consistency races.
 */
export class Matchmaker implements DurableObject {
  constructor(
    private readonly ctx: DurableObjectState,
    private readonly env: Env,
  ) {}

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected websocket", { status: 426 });
    }

    const url = new URL(request.url);
    const entry: QueueEntry = {
      playerId: generateId(16),
      displayName: url.searchParams.get("displayName") ?? undefined,
      userId: request.headers.get(TRUSTED_USER_ID_HEADER) ?? undefined,
    };

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server, [entry.playerId]);

    const queue = await this.getQueue();
    if (queue.length > 0) {
      const opponent = queue.shift()!;
      await this.setQueue(queue);
      await this.pairPlayers(opponent, entry, server);
    } else {
      queue.push(entry);
      await this.setQueue(queue);
      sendJson(server, { type: "queued", position: queue.length } satisfies ServerMatchmakingMessage);
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== "string") return;
    const parsed = parseJson<ClientMatchmakingMessage>(message);
    if (parsed?.type === "cancel") {
      await this.removeFromQueue(this.playerIdFor(ws));
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    await this.removeFromQueue(this.playerIdFor(ws));
  }

  private async pairPlayers(opponent: QueueEntry, newEntry: QueueEntry, newSocket: WebSocket): Promise<void> {
    const opponentSocket = this.ctx.getWebSockets(opponent.playerId)[0];
    if (!opponentSocket) {
      // Opponent's socket vanished between being dequeued and now; requeue the new player.
      const queue = await this.getQueue();
      queue.push(newEntry);
      await this.setQueue(queue);
      sendJson(newSocket, { type: "queued", position: queue.length } satisfies ServerMatchmakingMessage);
      return;
    }

    const gameId = generateId();
    const stub = this.env.GAME_SESSION.get(this.env.GAME_SESSION.idFromName(gameId));

    const initResponse = await stub.fetch("https://internal/init", {
      method: "POST",
      body: JSON.stringify({ gameId, displayName: opponent.displayName, userId: opponent.userId }),
    });
    const { secret: whiteSecret } = (await initResponse.json()) as { secret: string };

    const joinResponse = await stub.fetch("https://internal/join", {
      method: "POST",
      body: JSON.stringify({ displayName: newEntry.displayName, userId: newEntry.userId }),
    });
    const { secret: blackSecret } = (await joinResponse.json()) as { secret: string };

    sendJson(opponentSocket, { type: "matched", gameId, secret: whiteSecret, color: "white" } satisfies ServerMatchmakingMessage);
    sendJson(newSocket, { type: "matched", gameId, secret: blackSecret, color: "black" } satisfies ServerMatchmakingMessage);

    opponentSocket.close(1000, "matched");
    newSocket.close(1000, "matched");
  }

  private async removeFromQueue(playerId: string | null): Promise<void> {
    if (!playerId) return;
    const queue = await this.getQueue();
    const filtered = queue.filter((entry) => entry.playerId !== playerId);
    if (filtered.length !== queue.length) await this.setQueue(filtered);
  }

  private playerIdFor(ws: WebSocket): string | null {
    return this.ctx.getTags(ws)[0] ?? null;
  }

  private async getQueue(): Promise<QueueEntry[]> {
    return (await this.ctx.storage.get<QueueEntry[]>(QUEUE_KEY)) ?? [];
  }

  private async setQueue(queue: QueueEntry[]): Promise<void> {
    await this.ctx.storage.put(QUEUE_KEY, queue);
  }
}
