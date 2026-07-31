import type { Env } from "../env.js";
import { base64UrlDecode, base64UrlEncode, buildCookie, isSecureRequest, readCookie } from "./cookies.js";

const SESSION_COOKIE_NAME = "mchess_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

interface SessionPayload {
  uid: string;
  exp: number;
}

async function getHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function createSessionCookie(userId: string, env: Env, request: Request): Promise<string> {
  const payload: SessionPayload = { uid: userId, exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS };
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await getHmacKey(env.SESSION_SECRET);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  const value = `${payloadB64}.${base64UrlEncode(new Uint8Array(signature))}`;
  return buildCookie(SESSION_COOKIE_NAME, value, {
    maxAge: SESSION_MAX_AGE_SECONDS,
    secure: isSecureRequest(request),
  });
}

export async function verifySessionCookie(cookieHeader: string | null, env: Env): Promise<string | null> {
  const value = readCookie(cookieHeader, SESSION_COOKIE_NAME);
  if (!value) return null;

  const [payloadB64, signatureB64] = value.split(".");
  if (!payloadB64 || !signatureB64) return null;

  const key = await getHmacKey(env.SESSION_SECRET);
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    base64UrlDecode(signatureB64),
    new TextEncoder().encode(payloadB64),
  );
  if (!valid) return null;

  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64))) as SessionPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload.uid;
  } catch {
    return null;
  }
}

export function clearSessionCookie(request: Request): string {
  return buildCookie(SESSION_COOKIE_NAME, "", { maxAge: 0, secure: isSecureRequest(request) });
}
