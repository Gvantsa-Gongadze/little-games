# Little Games

A multiplayer mini-game platform built as a pnpm monorepo.

## Games

| Game | Route | Tag |
|------|-------|-----|
| Asteroids | `/asteroids` | CLASSIC |
| Bubble Shooter | `/bubble-shooter` | ARCADE |
| 2D Arena | `/game` | 2D |
| 3D Cube | `/game3d` | 3D |

### Asteroids
Classic top-down shooter rebuilt in Pixi.js. Features planets with gravitational pull, asteroid bounce physics, UFO enemies, triple-shot and shield power-ups, hyperspace jump, and a retro Web Audio synthesiser. Scores submitted to Supabase on death with a top-10 leaderboard overlay.

### Bubble Shooter
Hex-grid bubble shooter with a Colyseus backend for server-driven color generation. Fire bubbles to match clusters of 3+ and clear the board before a new row slides in every 8 shots.

- **6 special bubble types** — bomb (2-ring area blast), rainbow (wildcard match), colorBomb (wipes all bubbles of a color), stone (immune), frozen (2-hit unfreeze), lightning (clears an entire row)
- **Server-driven colors** — `BubbleShooterRoom` generates colors biased toward what's already on the board, keeping games winnable
- **Particle explosions** — popped bubbles burst into an expanding ring shockwave + 12 radial particle sparks in the bubble's color
- **Board pressure** — a new row slides in from the top every 8 shots; a progress bar counts down
- **Leaderboard** — scores saved to Supabase on win/lose; top-10 overlay with current player highlighted

### 2D Arena
Multiplayer top-down arena built with Pixi.js and Colyseus. Supports up to 4 players connected via WebSocket.

### 3D Cube
Rotating 3D cube scene built with Three.js and OrbitControls.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite |
| 2D engine | Pixi.js v8 |
| 3D engine | Three.js r168 |
| Animation / timers | GSAP |
| Multiplayer | Colyseus 0.15 (Node.js) |
| Auth & DB | Supabase |
| Sound | Web Audio API |
| Deploy | Vercel (client) + Railway (server) |

## Monorepo layout

```
little-games/
├── packages/
│   ├── client/   # Vite + React frontend
│   ├── server/   # Colyseus game server
│   └── shared/   # Shared TypeScript types
├── pnpm-workspace.yaml
└── package.json
```

## Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9 — install with `npm i -g pnpm`

## Local setup

```bash
# 1. Clone and install
git clone https://github.com/Gvantsa-Gongadze/little-games.git
cd little-games
pnpm install

# 2. Configure environment variables (see below)

# 3. Start both dev servers in parallel
pnpm dev
```

Or start them separately:

```bash
pnpm dev:client   # http://localhost:5173
pnpm dev:server   # ws://localhost:2567
```

## Environment variables

### `packages/client/.env`

```env
VITE_SERVER_URL=ws://localhost:2567
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

### `packages/server/.env`

```env
PORT=2567
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

> Both files are gitignored. Copy the examples above and fill in your Supabase project credentials.

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com)
2. Run the following SQL in the Supabase SQL editor:

```sql
create table scores (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        references auth.users not null,
  game       text        not null,
  score      integer     not null,
  username   text,
  created_at timestamptz default now()
);

alter table scores enable row level security;

create policy "Users can insert their own scores"
  on scores for insert
  with check (auth.uid() = user_id);

create policy "Anyone can read scores"
  on scores for select
  using (true);
```

3. Enable **Email** auth under Authentication → Providers

## Available scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start client + server in parallel |
| `pnpm dev:client` | Start Vite dev server on :5173 |
| `pnpm dev:server` | Start Colyseus on :2567 |
| `pnpm build:client` | Production build of the frontend |
| `pnpm build:server` | Compile the server TypeScript |
| `pnpm lint` | ESLint the client |
| `pnpm typecheck` | Type-check client + server |

## CI

GitHub Actions runs lint and type-check on every push and pull request targeting `main`. See [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## Deployment

- **Client** — connect the repo to Vercel; set the root directory to `packages/client` and add the `VITE_*` env vars in the Vercel dashboard.
- **Server** — connect the repo to Railway; set the root directory to `packages/server`. Railway uses [`railway.json`](packages/server/railway.json) to build and start the server. Add the server env vars in the Railway dashboard.
