# little-games — Claude Reference

Multiplayer mini-game platform. pnpm monorepo: `packages/client`, `packages/server`, `packages/shared`.

---

## Stack

| Layer | Tech | Version |
|-------|------|---------|
| Frontend | React + TypeScript + Vite | React 19, TS ~6.0, Vite 8 |
| 2D engine | Pixi.js | v8 |
| 3D engine | Three.js | r168 |
| Animation / timers | GSAP | ^3 |
| Multiplayer | Colyseus | 0.15 |
| Auth & DB | Supabase | @supabase/supabase-js ^2 |
| Sound | Web Audio API (custom `RetroAudio`) | — |
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
/           → redirect to /lobby
/lobby      → pages/Home.tsx        auth gate + game picker grid
/game       → pages/Game.tsx        Pixi.js 2D arena (arena-2d)
/game3d     → pages/Game3D.tsx      Three.js 3D cube
/asteroids  → pages/Asteroids.tsx   Asteroids game
```

### Entry Point (`main.tsx`)
Waits for the Press Start 2P web-font to activate before mounting React, eliminating flash of unstyled text (FOUT):
```ts
document.fonts.load('10px "Press Start 2P"').then(() => {
  createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
})
```
The font is also preloaded in `index.html` with `<link rel="preload" as="font">` and `display=block` to hold rendering until the font is ready.

### Pages

**`pages/Home.tsx`**
- Shows auth form (username + email + password) if logged out. `signIn` / `signUp` via Supabase.
- `signUp` stores username in `user_metadata` via `signUp({ options: { data: { username } } })`.
- When logged in: header shows username (not email) + sign-out button, grid of `<GameCard>` from `GAMES`.
- All UI strings come from `data/strings.json` (`T.home.*`).

**`pages/Asteroids.tsx`**
- Renders `<AsteroidsCanvas>` with a leaderboard overlay on game-over.
- `handleGameOver(score)` → reads `user_metadata.username`, calls `submitScore('asteroids', score, userId, username)`.
- Escape key navigates back to `/lobby`.

**`pages/Game.tsx`**
- Joins Colyseus `game_room` via `joinGameRoom('Player')` on mount; leaves on unmount.
- Renders `<ErrorBoundary><PixiCanvas onGameOver={handleGameOver} /></ErrorBoundary>`.
- `handleGameOver(score)` → reads `user_metadata.username`, calls `submitScore('2d-game', score, userId, username)`.
- Has a `<BackButton />` navigating to `/lobby`.

**`pages/Game3D.tsx`**
- Renders `<ErrorBoundary><ThreeCanvas /></ErrorBoundary>`.

### Components

**`components/BackButton.tsx`**
- Fixed-position button navigating to `/lobby`. Label from `T.nav.backToLobby` (`"◄ LOBBY"`).

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

### Data (`data/`)

**`data/strings.json`**
Single source of truth for all UI text. Import as `import T from '@/data/strings.json'`.
```
T.common.*       gameOver
T.hud.*          scoreLabel, livesLabel, waveLabel, hyperspaceReady, hyperspaceCooling,
                 tripleShot, shield, comboSuffix
T.leaderboard.*  top10, loading, noScores, youMarker, playAgain, restartHint
T.nav.*          backToLobby
T.home.*         title, tagline, signInTagline, usernamePlaceholder, emailPlaceholder,
                 passwordPlaceholder, confirmEmail, signIn, signUp, signOut
T.touch.*        left, right, thrust, fire, hyperspace
T.arena2d.*      pressSpace
```

**`data/games.ts`** — `GAMES: GameMeta[]`
```ts
[
  { id: 'asteroids', title: 'Asteroids', route: '/asteroids', tag: 'CLASSIC', accent: '#33ff66', emoji: '🚀' },
  { id: '2d-game',   title: '2D Arena',  route: '/game',      tag: '2D',      accent: '#00ff99', emoji: '🟩' },
  { id: '3d-cube',   title: '3D Cube',   route: '/game3d',    tag: '3D',      accent: '#a78bfa', emoji: '🟪' },
]
```

### Engine (`engine/`)

**`engine/SceneManager.ts`**
```ts
interface Scene { view: Container; update(delta: number): void; destroy(): void }
// switch(scene) → destroys current, removes stage children, adds new scene.view
// update(delta) → called every ticker tick
```

**`engine/input/Keyboard.ts`**
- Global `keydown`/`keyup` listeners on `window`.
- `Keyboard.isDown(code: string) → boolean`.

**`engine/ColyseusClient.ts`**
- Lazy singleton `Client`. `SERVER_URL` from `VITE_SERVER_URL` env (default `ws://localhost:2567`).
- `joinGameRoom(name)` → `client.joinOrCreate('game_room', { name })`.

### Asteroids Game (`games/asteroids/`)

**`AsteroidsCanvas.tsx`**
- Pixi `Application` (full-window), mounts `AsteroidsScene`, shows `<LeaderboardOverlay>` on game-over.
- `<TouchControls>` rendered as React overlay for mobile.

**`LeaderboardOverlay.tsx`**
- Fetches top 10 scores from `getLeaderboard('asteroids', 10)`.
- `Entry` type: `{ score, user_id, username: string | null, created_at }`.
- `displayName(e)` = `e.username || '???'`.
- Highlights current user's row in yellow + appends `" ◄"`.
- Press R or click "PLAY AGAIN" to restart.

**`TouchControls.tsx`**
- React overlay with on-screen D-pad and action buttons for mobile.
- Button labels from `T.touch.*`.

**`scenes/AsteroidsScene.ts`** — main game loop. Key behaviours:
- Manages `Ship`, `Asteroid[]`, `Bullet[]`, `Particle[]`, `PowerUp[]`, `UFO`, `Planet[]`.
- **Planets**: 1–2 spawned per game; radius 30–50; min 220px from center; min 120px apart.
  - Drift slowly across the arena (wrap with `wrap()`).
  - Exert gravity within `radius × 5`; strength `0.012 × (1 - dist/gravRadius) × delta`.
  - Bullets are destroyed on contact. Ship loses a life on contact.
  - Asteroids bounce off elastically (0.85 energy loss) → particle burst + sound.
- **Wave transition**: `betweenWaves` boolean + `waveDelay` countdown prevents re-entry.
  - Wave clear → `announceWave()` (increment wave counter, show text, start fade timer).
  - After ~1.5 s delay → `spawnAsteroids()`.
- **All timers use `gsap.delayedCall`** — no `setTimeout` anywhere.
  - `hyperspaceCall` and `endGameCall` stored as fields so `destroy()` can `.kill()` them.
- All HUD strings via `T.hud.*` / `T.common.*`.

**`audio/RetroAudio.ts`** — Web Audio API synthesiser.
- `getCtx()`: creates `AudioContext` lazily; calls `resume()` if suspended; returns `null` if not yet `'running'` (browser autoplay policy). Every audio method guards with `if (!ctx) return` — first sound after page load is silently dropped while context unlocks, no console error.
- `stopThrust()` uses `gsap.delayedCall(0.1, …)` to stop the looping node after gain ramps to zero.
- Methods: `shoot()`, `explode(size)`, `startThrust()`, `stopThrust()`, `collect()`, `ufoAlert()`, `hyperspaceIn()`, `hyperspaceOut()`, `die()`.

**`entities/Ship.ts`**
- `reset(x, y)`: sets `invincible = true`, uses `gsap.delayedCall(2.5, …)` to clear it.

**`entities/Planet.ts`**
- Five colour palettes (ice blue, mars red, emerald, gas giant, nebula purple).
- Rings drawn before body fill so body naturally masks the inner ring intersection.
- Visual layers: gravity haze → atmospheric glow → rings (optional) → body → terminator shadow → equatorial band → specular highlight.

**`entities/Asteroid.ts`**, **`Bullet.ts`**, **`Particle.ts`**, **`PowerUp.ts`**, **`UFO.ts`** — standard entity files.

**`utils/math.ts`** — `wrap({ x, y }, w, h)` and other helpers.

### Arena-2D Game (`games/arena-2d/`)

**`PixiCanvas.tsx`** — Pixi `Application`, mounts `SceneManager` → `MenuScene` → SPACE → `GameScene`.

**`scenes/MenuScene.ts`** — "Press SPACE to play" text (from `T.arena2d.pressSpace`). Space key calls `onStart()`.

**`scenes/GameScene.ts`** — Green 40×40 square, arrow-key movement. `onGameOver` callback accepted but **never called** (stub).

### Three.js Game (`games/cube-3d/`)

**`ThreeCanvas.tsx`** — WebGL detection, `WebGLRenderer` + `CubeScene` + `OrbitControls`. RAF loop, `ResizeObserver`.

**`scenes/CubeScene.ts`** — Green rotating cube (`0x00ff99`), `update(delta)` spins on x and y by `0.01 * delta`.

### Auth & Data (`lib/`, `hooks/`)

**`lib/supabase.ts`** — `createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)` singleton.

**`hooks/useAuth.ts`** — `{ user: User|null, loading: boolean }`. Uses `getUser()` + `onAuthStateChange`.

**`lib/scores.ts`**
```ts
submitScore(game, score, userId, username?)  // inserts row; username nullable
getLeaderboard(game, limit=10)               // selects score, user_id, username, created_at ordered by score desc
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
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        references auth.users not null,
  game       text        not null,   -- 'asteroids' | '2d-game' | '3d-cube'
  score      integer     not null,
  username   text,                   -- from user_metadata at submit time; nullable
  created_at timestamptz default now()
);
alter table scores enable row level security;
-- Policy: users insert own rows; anyone can read
```
Auth: Email provider enabled. Username stored in `auth.users.user_metadata.username` at sign-up and denormalised into `scores.username` at submit time.

> **Migration**: if the `username` column is missing, run in Supabase SQL editor:
> ```sql
> alter table scores add column username text;
> ```

---

## CI

`.github/workflows/ci.yml` — runs `pnpm lint` + `pnpm typecheck` on push/PR to `main`. Uses Node 20 + pnpm cache.

---

## What's Stub / Not Yet Built

| Feature | Status |
|---------|--------|
| Arena-2D game-over trigger | `GameScene` accepts `onGameOver` but never calls it |
| Multiplayer sync | Client joins room but never sends `'move'` or reads server state |
| Shared types usage | `IGameState`/`PlayerState` in `packages/shared` unused |

---

## Key Design Patterns

- **Scene pattern** — `SceneManager` manages one active `Scene` at a time on the Pixi stage. Each scene implements `{ view: Container; update(delta): void; destroy(): void }`.
- **GSAP for all async timing** — `gsap.delayedCall(seconds, fn)` replaces every `setTimeout`. Store the returned tween as a field and call `.kill()` in `destroy()` to prevent callbacks firing on dead scenes.
- **AudioContext autoplay guard** — `RetroAudio.getCtx()` returns `null` until the context is `'running'`; all sound methods guard with `if (!ctx) return`. No user-gesture prompt, no console error.
- **Font FOUT fix** — three-layer: `<link rel="preload">` in HTML, `display=block` on the Google Fonts stylesheet, `document.fonts.load()` in `main.tsx` before React mounts.
- **Centralised strings** — all UI text in `data/strings.json`, imported as `T`. Never inline string literals in component/scene files.
- **ErrorBoundary on canvas** — both Pixi and Three throw on WebGL failure; `ErrorBoundary` catches.
- **Singleton clients** — `ColyseusClient`, `supabase` are module-level singletons.
- **Ref-stable callbacks** — `PixiCanvas` uses `onGameOverRef` to avoid stale closure in game loop.
- **Inline styles** — all styling via `React.CSSProperties` const objects; no CSS modules or utility classes.
- **Dark theme** — background `#0f0f0f`, accent green `#00ff99`, borders `#222`, text white/gray.
