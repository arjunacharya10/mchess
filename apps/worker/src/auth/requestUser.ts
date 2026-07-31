import { getUserById, type UserRecord } from "../db/users.js";
import type { Env } from "../env.js";
import { verifySessionCookie } from "./session.js";

/**
 * Internal Worker->DO header carrying a verified userId. Trustworthy because only the
 * Worker script can ever call a Durable Object stub's fetch() — clients never reach a
 * DO directly — as long as index.ts strips any client-supplied copy before setting it.
 */
export const TRUSTED_USER_ID_HEADER = "X-Mchess-Trusted-User-Id";

export async function getSessionUser(request: Request, env: Env): Promise<UserRecord | null> {
  const userId = await verifySessionCookie(request.headers.get("Cookie"), env);
  if (!userId) return null;
  return getUserById(env, userId);
}
