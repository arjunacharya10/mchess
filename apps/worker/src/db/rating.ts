import type { Color } from "@mchess/chess-engine";
import { getRatingsByIds, setRatings } from "./users.js";
import type { Env } from "../env.js";

const K_FACTOR = 32;

function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

export function computeEloDelta(ratingA: number, ratingB: number, scoreA: number): number {
  return Math.round(K_FACTOR * (scoreA - expectedScore(ratingA, ratingB)));
}

/**
 * Updates both players' Elo, but only when both are signed-in accounts — guest and
 * mixed guest/account games stay unrated. All game-over reasons (including disconnect
 * timeout) count uniformly: dropping to dodge a loss still counts as a loss, same as
 * how chess.com/lichess treat abandonment.
 */
export async function applyRatingUpdates(
  env: Env,
  whiteUserId: string | undefined,
  blackUserId: string | undefined,
  winner: Color | null,
): Promise<void> {
  if (!whiteUserId || !blackUserId) return;

  const ratings = await getRatingsByIds(env, whiteUserId, blackUserId);
  if (!ratings) return;

  const whiteScore = winner === "white" ? 1 : winner === "black" ? 0 : 0.5;
  const delta = computeEloDelta(ratings.white, ratings.black, whiteScore);

  await setRatings(env, whiteUserId, ratings.white + delta, blackUserId, ratings.black - delta);
}
