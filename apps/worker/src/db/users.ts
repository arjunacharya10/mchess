import type { Env } from "../env.js";

export interface UserRecord {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  rating: number;
  currentGameId: string | null;
}

interface UserRow {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  rating: number;
  current_game_id: string | null;
}

function rowToRecord(row: UserRow): UserRecord {
  return {
    id: row.id,
    displayName: row.display_name ?? "Player",
    avatarUrl: row.avatar_url,
    rating: row.rating,
    currentGameId: row.current_game_id,
  };
}

export async function getUserById(env: Env, userId: string): Promise<UserRecord | null> {
  const row = await env.DB.prepare(
    "SELECT id, display_name, avatar_url, rating, current_game_id FROM users WHERE id = ?",
  )
    .bind(userId)
    .first<UserRow>();
  return row ? rowToRecord(row) : null;
}

export interface GithubProfileInput {
  providerUserId: string;
  displayName: string;
  avatarUrl: string;
  email: string | null;
}

export async function upsertGithubUser(env: Env, profile: GithubProfileInput): Promise<UserRecord> {
  const existing = await env.DB.prepare(
    "SELECT id, display_name, avatar_url, rating, current_game_id FROM users WHERE provider_user_id = ?",
  )
    .bind(profile.providerUserId)
    .first<UserRow>();

  if (existing) {
    await env.DB.prepare("UPDATE users SET display_name = ?, avatar_url = ? WHERE id = ?")
      .bind(profile.displayName, profile.avatarUrl, existing.id)
      .run();
    return rowToRecord({ ...existing, display_name: profile.displayName, avatar_url: profile.avatarUrl });
  }

  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO users (id, email, display_name, auth_provider, provider_user_id, avatar_url, created_at)
     VALUES (?, ?, ?, 'github', ?, ?, ?)`,
  )
    .bind(id, profile.email, profile.displayName, profile.providerUserId, profile.avatarUrl, Date.now())
    .run();

  return { id, displayName: profile.displayName, avatarUrl: profile.avatarUrl, rating: 1200, currentGameId: null };
}

export async function setCurrentGameId(env: Env, userId: string, gameId: string | null): Promise<void> {
  await env.DB.prepare("UPDATE users SET current_game_id = ? WHERE id = ?").bind(gameId, userId).run();
}

export async function getRatingsByIds(
  env: Env,
  whiteUserId: string,
  blackUserId: string,
): Promise<{ white: number; black: number } | null> {
  const [white, black] = await Promise.all([
    env.DB.prepare("SELECT rating FROM users WHERE id = ?").bind(whiteUserId).first<{ rating: number }>(),
    env.DB.prepare("SELECT rating FROM users WHERE id = ?").bind(blackUserId).first<{ rating: number }>(),
  ]);
  if (!white || !black) return null;
  return { white: white.rating, black: black.rating };
}

export async function setRatings(
  env: Env,
  whiteUserId: string,
  whiteRating: number,
  blackUserId: string,
  blackRating: number,
): Promise<void> {
  await Promise.all([
    env.DB.prepare("UPDATE users SET rating = ? WHERE id = ?").bind(whiteRating, whiteUserId).run(),
    env.DB.prepare("UPDATE users SET rating = ? WHERE id = ?").bind(blackRating, blackUserId).run(),
  ]);
}
