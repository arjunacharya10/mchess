import { getSessionUser } from "../auth/requestUser.js";
import type { Env } from "../env.js";
import { generateId } from "../utils/ids.js";

interface CreateRoomBody {
  displayName?: string;
  isPublic?: boolean;
}

/** Resolves the trusted identity for a request: an account's own name/id, or the guest-supplied name. */
async function resolveIdentity(
  request: Request,
  env: Env,
  body: CreateRoomBody,
): Promise<{ displayName?: string; userId?: string }> {
  const user = await getSessionUser(request, env);
  if (user) return { displayName: user.displayName, userId: user.id };
  return { displayName: body.displayName };
}

export async function handleCreateRoom(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as CreateRoomBody;
  const identity = await resolveIdentity(request, env, body);
  const gameId = generateId();
  const stub = env.GAME_SESSION.get(env.GAME_SESSION.idFromName(gameId));
  const initResponse = await stub.fetch("https://internal/init", {
    method: "POST",
    body: JSON.stringify({ gameId, ...identity, isPublic: body.isPublic ?? false }),
  });
  return new Response(await initResponse.text(), {
    status: initResponse.status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function handleRoomStatus(env: Env, gameId: string): Promise<Response> {
  const stub = env.GAME_SESSION.get(env.GAME_SESSION.idFromName(gameId));
  const statusResponse = await stub.fetch("https://internal/status");
  return new Response(await statusResponse.text(), {
    status: statusResponse.status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function handleJoinRoom(request: Request, env: Env, gameId: string): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as CreateRoomBody;
  const identity = await resolveIdentity(request, env, body);
  const stub = env.GAME_SESSION.get(env.GAME_SESSION.idFromName(gameId));
  const joinResponse = await stub.fetch("https://internal/join", {
    method: "POST",
    body: JSON.stringify(identity),
  });
  return new Response(await joinResponse.text(), {
    status: joinResponse.status,
    headers: { "Content-Type": "application/json" },
  });
}
