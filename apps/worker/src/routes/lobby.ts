import { listPublicGames } from "../db/publicGames.js";
import type { Env } from "../env.js";

export async function handleGetLobby(env: Env): Promise<Response> {
  const games = await listPublicGames(env);
  return Response.json({ games });
}
