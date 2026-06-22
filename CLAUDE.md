# little-games — Claude Reference

Multiplayer mini-game platform. pnpm monorepo: `packages/client`, `packages/server`, `packages/shared`.

---

## Stack

| Layer | Tech | Version |
|-------|------|---------|
| Frontend | React + TypeScript + Vite | React 19, TS ~6.0, Vite 8 |
| 2D engine | Pixi.js | v8 |
| 3D engine | Three.js | r168 |
| Multiplayer | Colyseus | 0.15 |
| Auth & DB | Supabase | @supabase/supabase-js ^2 |
| Sound | Howler.js | ^2.2 |
| Package manager | pnpm | 9.0.0 |
| Node | ≥ 20 | |

---

## Dev Commands

```bash
pnpm dev              # client + server in parallel
pnpm dev:client       # localhost:5173
pnpm dev:server       # ws://localhost:2567
pnpm build:client     # tsc -b && vite build
pnpm build:server     # tsc
pnpm typecheck        # client + server
pnpm lint             # eslint client only
```

---

## Monorepo Layout

```
little-games/
├── package.json              # root scripts
├── pnpm-workspace.yaml       # packages: packages/*
├── .github/workflows/ci.yml  # lint + typecheck on push/PR to main
└── packages/
    ├── client/               # Vite + React (port 5173)
    ├── server/               # Colyseus WS server (port 2567)
    └── shared/               # Shared TS types (IGameState, PlayerState)
```

---

## Client — File Map (`packages/client/src/`)

### Routing (`App.tsx`)
```
/        → pages/Home.tsx       auth gate + game picker grid
/game    → pages/Game.tsx       Pixi.js 2D arena
/game3d  → pages/Game3D.tsx     Three.js 3D cube
```

### Pages

**`pages/Home.tsx`**
- Shows auth form (email + password) if logged out. `signIn` / `signUp` via Supabase.
- When logged in: header with email + sign-out button, grid of `<GameCard>` from `GAMES`.

**`pages/Game.tsx`**
- Joins Colyseus `game_room` via `joinGameRoom('Player')` on mount; leaves on unmount.
- Renders `<ErrorBoundary><PixiCanvas onGameOver={handleGameOver} /></ErrorBoundary>`.
- `handleGameOver(score)` → `submitScore('2d-game', score, userId)`.

**`pages/Game3D.tsx`**
- Renders `<ErrorBoundary><ThreeCanvas /></ErrorBoundary>`.

### Components

**`components/PixiCanvas.tsx`**
- Creates Pixi `Application` (full-window, bg `#0f0f0f`, antialias, resizeTo window).
- Mounts `SceneManager` → starts with `MenuScene` → SPACE key → `GameScene`.
- Shows `<LoadingSpinner>` until ready. Throws `initError` for ErrorBoundary to catch.
- Uses `onGameOverRef` to keep callback stable across renders.

**`components/ErrorBoundary.tsx`**
- Class component with optional `fallback` prop `(error, reset) => ReactNode`.
- `DefaultFallback` detects WebGL errors by message keyword → friendlier copy + emoji.
- Reset button calls `setState({ error: null })`.

**`components/GameCard.tsx`**
- Displays game tile: emoji, title, description, accent color, tag badge.
- Play button → `navigate(game.route)`.
- All styles inline (`React.CSSProperties` consts).

**`components/LoadingSpinner.tsx`**
- Fixed overlay, green (#00ff99) spinning border on `#0f0f0f` bg.

### Game Engine — Pixi.js (`game/`)

**`game/SceneManager.ts`**
```ts
interface Scene { view: Container; update(delta: number): void; destroy(): void }
// switch(scene) → destroys current, removes stage children, adds new scene.view
// update(delta) → called every ticker tick
```

**`game/scenes/MenuScene.ts`**
- Pixi `Text` "Press SPACE to play" centered on screen.
- `keydown` listener: Space → removes listener, calls `onStart()`.

**`game/scenes/GameScene.ts`**
- Green 40×40 `Graphics` square, starts at screen center.
- Arrow key movement at `SPEED = 4` px/frame via `Keyboard.isDown`.
- Accepts `onGameOver` callback but **never calls it** (stub).

**`game/input/Keyboard.ts`**
- Global `keydown`/`keyup` listeners on `window`.
- `Keyboard.isDown(code: string) → boolean`.

**`game/ColyseusClient.ts`**
- Lazy singleton `Client`. `SERVER_URL` from `VITE_SERVER_URL` env (default `ws://localhost:2567`).
- `joinGameRoom(name)` → `client.joinOrCreate('game_room', { name })`.

**`game/SoundManager.ts`**
- Singleton `SoundManager` (Howler wrapper).
- SFX keys: `jump | hit | score | gameOver` → `/sounds/sfx/*.wav`.
- Music keys: `menu | game` → `/sounds/music/*.mp3`.
- Methods: `playSfx(key)`, `preloadSfx(keys[])`, `playMusic(key, volume?)`, `stopMusic()`, `toggleMute()`, `setVolume(v)`.
- **Sound files not present in repo** — `public/sounds/` directory doesn't exist yet.

### Three.js (`three/`)

**`three/ThreeCanvas.tsx`**
- Detects WebGL with `canvas.getContext('webgl2') || getContext('webgl')` — throws if missing.
- Creates `WebGLRenderer` + `CubeScene` + `OrbitControls` (damping enabled).
- RAF loop with `delta = (now - lastTime) / (1000/60)` for frame-rate-independent updates.
- `ResizeObserver` updates camera aspect + renderer size.

**`three/scenes/CubeScene.ts`**
- `PerspectiveCamera` (FOV 75, z=3).
- `AmbientLight` (0.5) + `DirectionalLight` at (5,5,5).
- Green `BoxGeometry(1,1,1)` + `MeshStandardMaterial({ color: 0x00ff99 })`.
- `update(delta)`: rotates cube on x and y by `0.01 * delta`.

### Auth & Data (`lib/`, `hooks/`)

**`lib/supabase.ts`** — `createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)` singleton.

**`hooks/useAuth.ts`** — `{ user: User|null, loading: boolean }`. Uses `getUser()` + `onAuthStateChange`.

**`lib/scores.ts`**
- `submitScore(game, score, userId)` → insert into `scores` table.
- `getLeaderboard(game, limit=10)` → select ordered by score desc.
- **Leaderboard UI not wired** — function exists but no page displays it.

**`data/games.ts`** — `GAMES: GameMeta[]`
```ts
[
  { id: '2d-game', title: '2D Arena', route: '/game',   tag: '2D', accent: '#00ff99', emoji: '🟩' },
  { id: '3d-cube', title: '3D Cube',  route: '/game3d', tag: '3D', accent: '#a78bfa', emoji: '🟪' },
]
```

### Vite Config (`vite.config.ts`)
- Port 5173, alias `@` → `src/`.
- Proxy `/api` → `http://localhost:2567`.
- Custom middleware silences Chrome DevTools `.well-known` 404.

### Client Env Vars (`packages/client/.env`)
```
VITE_SERVER_URL=ws://localhost:2567
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

---

## Server — File Map (`packages/server/src/`)

**`index.ts`**
- Express + HTTP + Colyseus `Server`.
- CORS: `ALLOWED_ORIGINS` env var (comma-separated, default `http://localhost:5173`).
- `GET /health` → `{ status: 'ok' }`.
- Registers `game_room` → `GameRoom`.

**`rooms/GameRoom.ts`**
- `maxClients = 4`.
- `onCreate`: sets state, handles `'move'` message → updates `player.x`, `player.y`.
- `onJoin`: creates `Player` with name from options.
- `onLeave`: deletes player from state.

**`schema/GameState.ts`**
```ts
class Player extends Schema {
  @type('number') x = 0
  @type('number') y = 0
  @type('string') name = ''
}
class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>()
}
```

### Server Env Vars (`packages/server/.env`)
```
PORT=2567
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
ALLOWED_ORIGINS=http://localhost:5173
```

### Railway Deploy (`railway.json`)
- Builder: NIXPACKS, build: `pnpm install && pnpm build`, start: `node dist/index.js`, restart on failure.

---

## Shared Package (`packages/shared/src/types.ts`)

```ts
interface PlayerState { x: number; y: number; name: string }
interface IGameState  { players: Record<string, PlayerState> }
```
Plain interfaces for type-sharing. **Not currently imported anywhere** — dead code.

---

## Supabase DB Schema

```sql
create table scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  game text not null,       -- '2d-game' | '3d-cube'
  score integer not null,
  created_at timestamptz default now()
);
alter table scores enable row level security;
-- Policy: users insert own rows; anyone can read
```
Auth: Email provider enabled.

---

## CI

`.github/workflows/ci.yml` — runs `pnpm lint` + `pnpm typecheck` on push/PR to `main`. Uses Node 20 + pnpm cache.

---

## What's Stub / Not Yet Built

| Feature | Status |
|---------|--------|
| Game-over trigger | `GameScene` accepts `onGameOver` but never calls it |
| Sound files | `SoundManager` wired up but `/public/sounds/` dir missing |
| Leaderboard UI | `getLeaderboard()` exists, never rendered |
| Multiplayer sync | Client joins room but never sends `'move'` or reads server state |
| Shared types usage | `IGameState`/`PlayerState` in `packages/shared` unused |

---

## Key Design Patterns

- **Scene pattern** — `SceneManager` manages one active `Scene` at a time on the Pixi stage.
- **ErrorBoundary on canvas** — both Pixi and Three throw on WebGL failure; `ErrorBoundary` catches.
- **Singleton clients** — `ColyseusClient`, `SoundManager`, `supabase` are module-level singletons.
- **Ref-stable callbacks** — `PixiCanvas` uses `onGameOverRef` to avoid stale closure in game loop.
- **Inline styles** — all styling via `React.CSSProperties` const objects; no CSS modules or utility classes.
- **Dark theme** — background `#0f0f0f`, accent green `#00ff99`, borders `#222`, text white/gray.
