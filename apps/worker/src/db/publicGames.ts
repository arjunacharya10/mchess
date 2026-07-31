import type { Env } from "../env.js";

export interface PublicGameRow {
  gameId: string;
  status: "waiting-for-opponent" | "in-progress";
  whiteDisplayName: string | null;
  blackDisplayName: string | null;
  whiteUserId: string | null;
  blackUserId: string | null;
  createdAt: number;
  updatedAt: number;
}

interface RawRow {
  game_id: string;
  status: "waiting-for-opponent" | "in-progress";
  white_display_name: string | null;
  black_display_name: string | null;
  white_user_id: string | null;
  black_user_id: string | null;
  created_at: number;
  updated_at: number;
}

function toPublicGameRow(row: RawRow): PublicGameRow {
  return {
    gameId: row.game_id,
    status: row.status,
    whiteDisplayName: row.white_display_name,
    blackDisplayName: row.black_display_name,
    whiteUserId: row.white_user_id,
    blackUserId: row.black_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function insertPublicGame(
  env: Env,
  gameId: string,
  whiteDisplayName: string,
  whiteUserId: string | undefined,
): Promise<void> {
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO public_games (game_id, status, white_display_name, white_user_id, created_at, updated_at)
     VALUES (?, 'waiting-for-opponent', ?, ?, ?, ?)`,
  )
    .bind(gameId, whiteDisplayName, whiteUserId ?? null, now, now)
    .run();
}

export async function updatePublicGameOnJoin(
  env: Env,
  gameId: string,
  blackDisplayName: string,
  blackUserId: string | undefined,
): Promise<void> {
  await env.DB.prepare(
    "UPDATE public_games SET black_display_name = ?, black_user_id = ?, updated_at = ? WHERE game_id = ?",
  )
    .bind(blackDisplayName, blackUserId ?? null, Date.now(), gameId)
    .run();
}

export async function updatePublicGameStatus(
  env: Env,
  gameId: string,
  status: "waiting-for-opponent" | "in-progress",
): Promise<void> {
  await env.DB.prepare("UPDATE public_games SET status = ?, updated_at = ? WHERE game_id = ?")
    .bind(status, Date.now(), gameId)
    .run();
}

export async function deletePublicGame(env: Env, gameId: string): Promise<void> {
  await env.DB.prepare("DELETE FROM public_games WHERE game_id = ?").bind(gameId).run();
}

export async function listPublicGames(env: Env, limit = 50): Promise<PublicGameRow[]> {
  const { results } = await env.DB.prepare(
    "SELECT * FROM public_games ORDER BY created_at DESC LIMIT ?",
  )
    .bind(limit)
    .all<RawRow>();
  return results.map(toPublicGameRow);
}
