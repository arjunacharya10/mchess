const STORAGE_PREFIX = "mchess:secret:";
const GUEST_NAME_KEY = "mchess:guestName";
const MY_GAMES_KEY = "mchess:myGames";
const MAX_TRACKED_GAMES = 20;

/** Per-gameId player secret persisted in localStorage so a reload can reconnect as the same player. */
export function getStoredSecret(gameId: string): string | null {
  return localStorage.getItem(STORAGE_PREFIX + gameId);
}

export function storeSecret(gameId: string, secret: string): void {
  localStorage.setItem(STORAGE_PREFIX + gameId, secret);
}

export function getGuestName(): string {
  return localStorage.getItem(GUEST_NAME_KEY) ?? "";
}

export function setGuestName(name: string): void {
  localStorage.setItem(GUEST_NAME_KEY, name);
}

export interface MyGameEntry {
  gameId: string;
  addedAt: number;
}

/** Capped local index of games this guest browser has created/joined, most recent last. */
export function getMyGames(): MyGameEntry[] {
  try {
    const raw = localStorage.getItem(MY_GAMES_KEY);
    return raw ? (JSON.parse(raw) as MyGameEntry[]) : [];
  } catch {
    return [];
  }
}

export function addMyGame(gameId: string): void {
  const games = getMyGames().filter((g) => g.gameId !== gameId);
  games.push({ gameId, addedAt: Date.now() });
  while (games.length > MAX_TRACKED_GAMES) games.shift();
  localStorage.setItem(MY_GAMES_KEY, JSON.stringify(games));
}

export function removeMyGame(gameId: string): void {
  const games = getMyGames().filter((g) => g.gameId !== gameId);
  localStorage.setItem(MY_GAMES_KEY, JSON.stringify(games));
}
