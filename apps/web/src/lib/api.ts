import type { Color } from "@mchess/chess-engine";

export interface RoomCredentials {
  gameId: string;
  secret: string;
  color: Color;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data as { error?: string }).error ?? `Request failed (${response.status})`);
  }
  return data as T;
}

export function createRoom(displayName?: string, isPublic?: boolean): Promise<RoomCredentials> {
  return postJson("/api/rooms", { displayName, isPublic });
}

export function joinRoom(gameId: string, displayName?: string): Promise<RoomCredentials> {
  return postJson(`/api/rooms/${gameId}/join`, { displayName });
}

export interface PublicGame {
  gameId: string;
  status: "waiting-for-opponent" | "in-progress";
  whiteDisplayName: string | null;
  blackDisplayName: string | null;
  createdAt: number;
}

export async function getLobby(): Promise<PublicGame[]> {
  const response = await fetch("/api/lobby");
  const data = (await response.json()) as { games: PublicGame[] };
  return data.games;
}

export interface RoomStatus {
  status: "waiting-for-opponent" | "in-progress" | "completed";
  visibility: "private" | "public";
  whiteDisplayName: string | null;
  blackDisplayName: string | null;
}

export async function getRoomStatus(gameId: string): Promise<RoomStatus> {
  const response = await fetch(`/api/rooms/${gameId}/status`);
  if (!response.ok) throw new Error(`Room status request failed (${response.status})`);
  return response.json();
}

export interface AccountUser {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  rating: number;
  currentGameId: string | null;
}

export type SessionInfo = { signedIn: false } | { signedIn: true; user: AccountUser };

export async function getMe(): Promise<SessionInfo> {
  const response = await fetch("/api/me");
  return response.json();
}

export interface HistoryEntry {
  id: string;
  whiteDisplayName: string;
  blackDisplayName: string;
  result: string;
  resultReason: string;
  endedAt: number;
}

export async function getHistory(): Promise<HistoryEntry[]> {
  const response = await fetch("/api/me/history");
  if (!response.ok) return [];
  const data = (await response.json()) as { history: HistoryEntry[] };
  return data.history;
}

export async function logout(): Promise<void> {
  await fetch("/auth/logout", { method: "POST" });
}
