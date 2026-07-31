import type { Env } from "../env.js";

export interface HistoryEntry {
  id: string;
  whiteDisplayName: string;
  blackDisplayName: string;
  result: string;
  resultReason: string;
  endedAt: number;
}

interface HistoryRow {
  id: string;
  white_display_name: string;
  black_display_name: string;
  result: string;
  result_reason: string;
  ended_at: number;
}

export async function getHistoryForUser(env: Env, userId: string, limit = 20): Promise<HistoryEntry[]> {
  const { results } = await env.DB.prepare(
    `SELECT id, white_display_name, black_display_name, result, result_reason, ended_at
     FROM games WHERE white_user_id = ?1 OR black_user_id = ?1
     ORDER BY ended_at DESC LIMIT ?2`,
  )
    .bind(userId, limit)
    .all<HistoryRow>();

  return results.map((r) => ({
    id: r.id,
    whiteDisplayName: r.white_display_name,
    blackDisplayName: r.black_display_name,
    result: r.result,
    resultReason: r.result_reason,
    endedAt: r.ended_at,
  }));
}
