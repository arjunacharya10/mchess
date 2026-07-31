const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

/** Short, URL-safe id (e.g. for a shareable game room link). Not a secret. */
export function generateId(length = 10): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/** Unguessable per-player secret used to authenticate a game's WebSocket connection. */
export function generateSecret(): string {
  return crypto.randomUUID();
}
