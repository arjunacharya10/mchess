import type { Env } from "../env.js";

const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";

export function buildAuthorizeUrl(state: string, env: Env, callbackUrl: string): string {
  const url = new URL(GITHUB_AUTHORIZE_URL);
  url.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  url.searchParams.set("redirect_uri", callbackUrl);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", "read:user");
  return url.toString();
}

export async function exchangeCodeForToken(code: string, env: Env, callbackUrl: string): Promise<string> {
  const response = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: callbackUrl,
    }),
  });
  const data = (await response.json()) as { access_token?: string; error?: string; error_description?: string };
  if (!data.access_token) {
    throw new Error(data.error_description ?? data.error ?? "GitHub token exchange failed");
  }
  return data.access_token;
}

export interface GithubProfile {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  email: string | null;
}

export async function fetchGithubProfile(accessToken: string): Promise<GithubProfile> {
  const response = await fetch(GITHUB_USER_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      // GitHub's API rejects requests with no User-Agent header.
      "User-Agent": "mchess-app",
      Accept: "application/vnd.github+json",
    },
  });
  if (!response.ok) throw new Error(`GitHub profile fetch failed (${response.status})`);
  return (await response.json()) as GithubProfile;
}
