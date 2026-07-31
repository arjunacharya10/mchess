import type { Env } from "./env.js";
import { GameSession } from "./durable-objects/GameSession.js";
import { Matchmaker } from "./durable-objects/Matchmaker.js";
import { handleCreateRoom, handleJoinRoom, handleRoomStatus } from "./routes/rooms.js";
import {
  handleGithubCallback,
  handleGithubLogin,
  handleLogout,
  handleMe,
  handleMyHistory,
} from "./routes/auth.js";
import { getSessionUser, TRUSTED_USER_ID_HEADER } from "./auth/requestUser.js";
import { handleGetLobby } from "./routes/lobby.js";

/**
 * Clones a WebSocket-upgrade request with a verified trusted-userId header, always
 * discarding any client-supplied copy first — a client can never reach a Durable
 * Object directly, so this header is only trustworthy because the Worker itself sets it.
 */
async function withTrustedUserId(request: Request, env: Env): Promise<Request> {
  const user = await getSessionUser(request, env);
  const headers = new Headers(request.headers);
  headers.delete(TRUSTED_USER_ID_HEADER);
  if (user) headers.set(TRUSTED_USER_ID_HEADER, user.id);
  return new Request(request.url, { method: request.method, headers, body: request.body });
}

export { GameSession, Matchmaker };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/auth/github/login" && request.method === "GET") {
      return handleGithubLogin(request, env);
    }
    if (url.pathname === "/auth/github/callback" && request.method === "GET") {
      return handleGithubCallback(request, env);
    }
    if (url.pathname === "/auth/logout" && request.method === "POST") {
      return handleLogout(request);
    }
    if (url.pathname === "/api/me" && request.method === "GET") {
      return handleMe(request, env);
    }
    if (url.pathname === "/api/me/history" && request.method === "GET") {
      return handleMyHistory(request, env);
    }

    if (url.pathname === "/api/lobby" && request.method === "GET") {
      return handleGetLobby(env);
    }

    if (url.pathname === "/api/rooms" && request.method === "POST") {
      return handleCreateRoom(request, env);
    }

    const joinMatch = url.pathname.match(/^\/api\/rooms\/([^/]+)\/join$/);
    if (joinMatch && request.method === "POST") {
      return handleJoinRoom(request, env, joinMatch[1]);
    }

    const statusMatch = url.pathname.match(/^\/api\/rooms\/([^/]+)\/status$/);
    if (statusMatch && request.method === "GET") {
      return handleRoomStatus(env, statusMatch[1]);
    }

    if (url.pathname.startsWith("/ws/game/")) {
      const gameId = url.pathname.slice("/ws/game/".length);
      const stub = env.GAME_SESSION.get(env.GAME_SESSION.idFromName(gameId));
      return stub.fetch(await withTrustedUserId(request, env));
    }

    if (url.pathname === "/ws/matchmaking") {
      const stub = env.MATCHMAKER.get(env.MATCHMAKER.idFromName("global"));
      return stub.fetch(await withTrustedUserId(request, env));
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
