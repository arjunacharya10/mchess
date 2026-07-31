# mchess — 7x7 Chess on Cloudflare

A chess variant played on a 7x7 board, deployed entirely on Cloudflare's stack (Workers, Durable Objects, D1).

## The variant

- **7x7 board** (files a–g, ranks 1–7), back rank `R N B K B N R`, king centered on the d-file.
- **No queens in the starting position.** Pawns fill all of rank 2/rank 6.
- **Rook and Bishop slide at most 3 squares** per move. Queens (which only ever appear via promotion) are unlimited.
- **No castling.**
- Pawns may promote to Queen, Rook, Bishop, or Knight. Everything else — check, checkmate, stalemate, en passant, draws by repetition/insufficient material/fifty-move rule — follows standard chess rules, adapted to the smaller board.

## Features

- **Private games** via a shareable link, or a **public game** listed in a lobby anyone can browse and join.
- **Quick match** — a FIFO matchmaking queue pairs you with any waiting opponent.
- **Spectating** — public in-progress games can be watched live, read-only.
- **Guest play** — no account needed; just pick a display name.
- **GitHub sign-in** — optional accounts with persistent Elo ratings (games only count toward rating when both players are signed in) and match history.
- **Resume your game** — a banner on the home screen picks back up an in-progress game, via local storage for guests or a cross-device pointer for signed-in accounts.

## Architecture

A single Cloudflare Worker serves the built frontend and handles all API/WebSocket traffic — one origin, no CORS.

- **Durable Objects**
  - `GameSession` — one instance per game. Holds the authoritative board state, validates every move server-side, and broadcasts updates over hibernating WebSockets. Also runs the 5-minute disconnect-forfeit timer via a DO alarm.
  - `Matchmaker` — a singleton FIFO queue that pairs waiting players and spins up a fresh `GameSession`.
- **D1** — optional accounts (GitHub identity, Elo rating, cross-device "current game" pointer), a public lobby directory, and permanent archived game history. In-progress game state never touches D1; it lives solely in the owning `GameSession`'s Durable Object storage.
- **Static assets** — the Worker's `[assets]` binding serves the built React app directly.

### Repo layout

```
apps/
  web/                React + Vite frontend
  worker/             Cloudflare Worker: routes, Durable Objects, D1 access, auth
packages/
  chess-engine/       Isomorphic rules engine (zero deps), used by both the Worker
                       (authoritative validation) and the browser (move highlighting)
  protocol/           Shared WebSocket message types
```

## Local development

```
npm install
npm run build:web                                   # builds apps/web/dist, which the Worker serves
cp apps/worker/.dev.vars.example apps/worker/.dev.vars   # fill in a SESSION_SECRET at minimum
cd apps/worker
npx wrangler d1 migrations apply mchess-db --local
npx wrangler dev
```

The app is then served at `http://localhost:8787`. For frontend hot-reload during UI work, run `npm run dev:web` (in `apps/web`) alongside `wrangler dev` — `vite.config.ts` proxies `/api` and `/ws` to the Worker.

Run the rules-engine test suite with `npm run test:engine`, and typecheck everything with `npm run typecheck --workspace <package>` (or `--workspaces` for all four).

## Deploying

```
wrangler login
wrangler d1 create mchess-db          # paste the returned database_id into apps/worker/wrangler.toml
wrangler secret put GITHUB_CLIENT_SECRET
wrangler secret put SESSION_SECRET
npm run build:web
npx wrangler d1 migrations apply mchess-db --remote
npm run deploy
```

GitHub sign-in requires registering a GitHub OAuth App (callback URL `https://<your-worker-domain>/auth/github/callback`) and putting its client ID in `apps/worker/wrangler.toml`'s `[vars]` block.
