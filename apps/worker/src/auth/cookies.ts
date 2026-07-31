export interface CookieOptions {
  /** Seconds until expiry; 0 clears the cookie immediately. */
  maxAge: number;
  secure: boolean;
}

export function buildCookie(name: string, value: string, options: CookieOptions): string {
  const parts = [`${name}=${value}`, "HttpOnly", "SameSite=Lax", "Path=/", `Max-Age=${options.maxAge}`];
  if (options.secure) parts.push("Secure");
  return parts.join("; ");
}

export function readCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const separatorIndex = part.indexOf("=");
    if (separatorIndex === -1) continue;
    if (part.slice(0, separatorIndex).trim() === name) return part.slice(separatorIndex + 1).trim();
  }
  return null;
}

/** wrangler dev serves over plain http, where a Secure cookie would never be sent back. */
export function isSecureRequest(request: Request): boolean {
  return new URL(request.url).protocol === "https:";
}

export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64UrlDecode(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
