import { buildCookie, isSecureRequest, readCookie } from "./cookies.js";

const OAUTH_STATE_COOKIE_NAME = "mchess_oauth_state";
const OAUTH_STATE_MAX_AGE_SECONDS = 5 * 60;

export function createOAuthStateCookie(state: string, request: Request): string {
  return buildCookie(OAUTH_STATE_COOKIE_NAME, state, {
    maxAge: OAUTH_STATE_MAX_AGE_SECONDS,
    secure: isSecureRequest(request),
  });
}

export function readOAuthStateCookie(request: Request): string | null {
  return readCookie(request.headers.get("Cookie"), OAUTH_STATE_COOKIE_NAME);
}

export function clearOAuthStateCookie(request: Request): string {
  return buildCookie(OAUTH_STATE_COOKIE_NAME, "", { maxAge: 0, secure: isSecureRequest(request) });
}
