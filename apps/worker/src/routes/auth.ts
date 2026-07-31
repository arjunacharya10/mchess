import { getSessionUser } from "../auth/requestUser.js";
import { buildAuthorizeUrl, exchangeCodeForToken, fetchGithubProfile } from "../auth/github.js";
import { clearOAuthStateCookie, createOAuthStateCookie, readOAuthStateCookie } from "../auth/oauthState.js";
import { clearSessionCookie, createSessionCookie } from "../auth/session.js";
import { getHistoryForUser } from "../db/history.js";
import { upsertGithubUser } from "../db/users.js";
import type { Env } from "../env.js";
import { generateSecret } from "../utils/ids.js";

function callbackUrl(request: Request): string {
  return `${new URL(request.url).origin}/auth/github/callback`;
}

export function handleGithubLogin(request: Request, env: Env): Response {
  const state = generateSecret();
  const authorizeUrl = buildAuthorizeUrl(state, env, callbackUrl(request));
  return new Response(null, {
    status: 302,
    headers: { Location: authorizeUrl, "Set-Cookie": createOAuthStateCookie(state, request) },
  });
}

export async function handleGithubCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = readOAuthStateCookie(request);

  if (!code || !state || !expectedState || state !== expectedState) {
    return new Response("Invalid OAuth state", { status: 400 });
  }

  const accessToken = await exchangeCodeForToken(code, env, callbackUrl(request));
  const profile = await fetchGithubProfile(accessToken);
  const user = await upsertGithubUser(env, {
    providerUserId: String(profile.id),
    displayName: profile.name ?? profile.login,
    avatarUrl: profile.avatar_url,
    email: profile.email,
  });

  const headers = new Headers({ Location: "/" });
  headers.append("Set-Cookie", await createSessionCookie(user.id, env, request));
  headers.append("Set-Cookie", clearOAuthStateCookie(request));
  return new Response(null, { status: 302, headers });
}

export function handleLogout(request: Request): Response {
  return new Response(null, { status: 204, headers: { "Set-Cookie": clearSessionCookie(request) } });
}

export async function handleMe(request: Request, env: Env): Promise<Response> {
  const user = await getSessionUser(request, env);
  if (!user) return Response.json({ signedIn: false });
  return Response.json({ signedIn: true, user });
}

export async function handleMyHistory(request: Request, env: Env): Promise<Response> {
  const user = await getSessionUser(request, env);
  if (!user) return Response.json({ error: "not-signed-in" }, { status: 401 });
  const history = await getHistoryForUser(env, user.id);
  return Response.json({ history });
}
