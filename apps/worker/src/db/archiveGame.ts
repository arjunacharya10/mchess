import type { SerializedMove } from "@mchess/chess-engine";
import type { Env } from "../env.js";

export interface ArchiveGameParams {
  gameId: string;
  whiteUserId?: string;
  blackUserId?: string;
  whiteDisplayName: string;
  blackDisplayName: string;
  result: "white" | "black" | "draw";
  resultReason: string;
  moveLog: SerializedMove[];
  startedAt: number;
  endedAt: number;
}

/** Archives a completed game to D1. In-progress games never touch D1 (see GameSession). */
export async function archiveGame(env: Env, params: ArchiveGameParams): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO games
      (id, white_user_id, black_user_id, white_display_name, black_display_name,
       result, result_reason, move_log, started_at, ended_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      params.gameId,
      params.whiteUserId ?? null,
      params.blackUserId ?? null,
      params.whiteDisplayName,
      params.blackDisplayName,
      params.result,
      params.resultReason,
      JSON.stringify(params.moveLog),
      params.startedAt,
      params.endedAt,
    )
    .run();
}
