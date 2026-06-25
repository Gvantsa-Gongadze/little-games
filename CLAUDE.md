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
/                → redirect to /lobby
/lobby           → pages/Home.tsx             auth gate + game picker grid
/game            → pages/Game.tsx             Pixi.js 2D arena (arena-2d)
/game3d          → pages/Game3D.tsx           Three.js 3D cube
/asteroids       → pages/Asteroids.tsx        Asteroids game
/bubble-shooter  → pages/BubbleShooter.tsx    Bubble Shooter game
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

**`pages/BubbleShooter.tsx`**
- `handleGameOver(score)` → reads `user_metadata.username`, calls `submitScore('bubble-shooter', score, userId, username)`.
- Passes `handleGameOver` to `<BubbleShooterCanvas onGameOver={handleGameOver} />`.
- `BubbleShooterCanvas` handles the overlay itself (React component, not Pixi).

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
T.bubble.*       pressSpace, gameOver, win, score, next, scoreDefault
```

**`data/games.ts`** — `GAMES: GameMeta[]`; `tag` type: `'2D' | '3D' | 'ARCADE' | 'CLASSIC'`
```ts
[
  { id: 'asteroids',       title: 'Asteroids',       route: '/asteroids',       tag: 'CLASSIC', accent: '#33ff66', emoji: '🚀' },
  { id: '2d-game',         title: '2D Arena',         route: '/game',            tag: '2D',      accent: '#00ff99', emoji: '🟩' },
  { id: '3d-cube',         title: '3D Cube',          route: '/game3d',          tag: '3D',      accent: '#a78bfa', emoji: '🟪' },
  { id: 'bubble-shooter',  title: 'Bubble Shooter',  route: '/bubble-shooter',  tag: 'ARCADE',  accent: '#ff6eb4', emoji: '🫧' },
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
- `joinBubbleShooterRoom()` → `client.joinOrCreate('bubble_shooter_room')`.

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

### Bubble Shooter Game (`games/bubble-shooter/`)

**`constants.ts`** — single source of truth for all numeric tuning values:
```ts
BUBBLE_RADIUS     = 20           // px, radius of every bubble
COL_SPACING       = 40           // px, centre-to-centre horizontal (= BUBBLE_RADIUS * 2)
ROW_SPACING       ≈ 34.6         // px, centre-to-centre vertical (= BUBBLE_RADIUS * √3, hex packing)
COLS              = 11           // bubbles per even row; odd rows have COLS-1 (10)
INITIAL_ROWS      = 5            // rows pre-filled at level start
GRID_TOP_PAD      = 40           // px from top of canvas to row-0 centre
BUBBLE_SPEED      = 12           // px per frame at deltaTime=1
LAUNCHER_Y_OFFSET = 70           // px from bottom of screen to launcher centre
BARREL_LENGTH     = 44           // px from launcher centre to barrel tip
MIN_AIM_ANGLE     = 18° (rad)    // minimum angle from horizontal — prevents near-horizontal shots
HUD_FONT          = '"Press Start 2P"'  // CSS fontFamily used for every in-game Text node
SPECIAL_SPAWN_RATE = 0.15        // 15 % chance each queued bubble is a special type
ADVANCE_EVERY     = 8            // shots fired between each board-pressure row advance
BubbleColor       = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange'
SpecialType       = 'bomb' | 'rainbow' | 'colorBomb' | 'stone' | 'frozen' | 'lightning'
COLOR_HEX         = { red: 0xe74c3c, blue: 0x3498db, green: 0x2ecc71,
                       yellow: 0xf1c40f, purple: 0x9b59b6, orange: 0xe67e22 }
SPECIAL_COLOR_HEX = { bomb: 0x2c2c2c, rainbow: 0xeeeeee, colorBomb: 0xf4d03f,
                       stone: 0x7f8c8d, frozen: 0xaed6f1, lightning: 0xf7dc6f }
```

**`BubbleShooterCanvas.tsx`**
- Accepts `onGameOver?: (score, state) => void` prop (ref-stable via `onGameOverRef`).
- On mount: joins `bubble_shooter_room` via `joinBubbleShooterRoom()`, registers `room.onMessage('colors', batch => colorQueue.push(...batch))`, requests 80 initial colors (`INITIAL_REQUEST`), and awaits the first response **in parallel** with `app.init()` via `Promise.all` to minimise startup time.
- Maintains a plain local `BubbleColor[]` queue (not Colyseus state — `ArraySchema` requires client-side schema registration to decode). Colors are consumed via `colorQueue.shift()`.
- `getNextColor()` closure: shifts one color, sends `'request_colors'` to the server whenever the queue drops below `REFILL_AT = 8`, keeping ~20 colors buffered ahead.
- Passes `getNextColor` as the second constructor argument to `BubbleShooterScene`.
- Calls `room.leave()` in the cleanup function.
- Renders `<BubbleLeaderboardOverlay>` over the canvas when `gameOver !== null`; passes `() => window.location.reload()` as `onRestart`.
- Constants: `INITIAL_REQUEST = 80` (board 53 cells + launchers + buffer), `QUEUE_TARGET = 20`, `REFILL_AT = 8`.

**`BubbleLeaderboardOverlay.tsx`**
- Props: `score`, `state: 'won' | 'lost'`, `onRestart`.
- Fetches top 10 from `getLeaderboard('bubble-shooter', 10)`.
- Pink accent `#ff6eb4`, `"Press Start 2P"` font. Shows `T.bubble.win` / `T.bubble.gameOver`, score, ranked table, PLAY AGAIN button + "OR PRESS R" hint.
- Highlights current user's row in yellow `#ffdd00` + appends `" ◄"`.
- R key listener wired to `onRestart`.

**`scenes/BubbleShooterScene.ts`** — main game loop. Rendering layers (back → front):

| Layer | Contents |
|---|---|
| `gridLayer` | Static grid bubbles (via `grid.container`) |
| `flightLayer` | In-flight bubble while travelling |
| `dropLayer` | Floating bubbles mid-fall animation |
| `walls` + `bar` | Playfield wall lines + bottom platform (static Graphics) |
| `launcherLayer` | Aim guide + launcher visual + current bubble + "NEXT" label + next bubble preview |
| `advanceBar` | Board-pressure progress bar — rendered above everything except HUD |
| `hudLayer` | Score panel fixed to top-right of screen (topmost Pixi layer) |

Constructor: `BubbleShooterScene(app, getNextColor, onGameOver?)` — `getNextColor` is the second argument (required); `onGameOver` is optional third.

Initial board: generated dynamically in the constructor using `Array.from({ length: INITIAL_ROWS }, (_, r) => Array.from({ length: grid.colsInRow(r) }, () => getNextColor()))`, then passed to `grid.populate()`. No hardcoded level layout — every game starts differently.

Key fields:
- `wallLeft` / `wallRight` — x-coordinates of the grid's left and right edges (`startX - BUBBLE_RADIUS` and `startX - BUBBLE_RADIUS + gridPixelWidth`). Bounce walls are the **grid edges**, not the screen edges — this keeps fired bubbles inside the grid's column range at all times.
- `currentBubble` — the bubble sitting at the launcher, ready to fire.
- `nextBubble` — preview bubble rendered 65 px to the right of the launcher center, with a "NEXT" label (`T.bubble.next`) above it. Both live in `launcherLayer`.
- `score` — running integer score (starts at 0).
- `scoreText` — Pixi `Text` node inside `hudLayer`; updated and scale-bumped by `addScore()`.
- `gameState` — `'playing' | 'won' | 'lost'`; starts `'playing'`. `handleAim` and `handleFire` both guard on this so the launcher freezes on result.
- `getNextColor` — `() => BubbleColor` callback injected from `BubbleShooterCanvas`; called by `spawnBubble()` and `addTopRow`. All color sourcing goes through this — no internal sampling logic.
- `onGameOver?` — `(score: number, state: 'won' | 'lost') => void` callback passed from `BubbleShooterCanvas`; called by `showResult()` to hand off to React for overlay and score submission.
- `dangerY` — pixel y-coordinate of the danger line (`launcherY - BUBBLE_RADIUS * 4`). A red line is drawn here in the `walls` Graphics. Any bubble whose grid y ≥ `dangerY` after landing triggers a loss.
- `advanceBar` — `Graphics` instance for the pressure-bar; redrawn on every shot via `updateAdvanceBar()`.
- `shotsUntilAdvance` — countdown from `ADVANCE_EVERY` (8); decrements each shot, triggers `advanceBoard()` and resets to 8 when it reaches 0.

Key behaviours:
- **Bubble spawning** (`spawnBubble()`): 85 % chance → `new Bubble(getNextColor())`. 15 % chance → picks a random `SpecialType` from all 6 and returns `new Bubble(getNextColor(), type)`. Color always comes from the injected `getNextColor` callback (server-sourced), special type is decided client-side.
- **Mouse aim** (`mousemove`): `toAimAngle()` converts pointer position to an angle clamped to `[-π + MIN_AIM_ANGLE, -MIN_AIM_ANGLE]` (always upward, never near-horizontal). Updates `Launcher.setAngle()` and sets `aimDirty = true` — does NOT call `drawAimGuide` directly (avoids rAF violation).
- **Aim guide dirty flag**: `aimDirty` boolean; set `true` on every mouse move, cleared in `update()` after redrawing once per frame. Prevents the 38-circle Graphics redraw from firing hundreds of times per second from raw `mousemove` events.
- **Fire** (`click`): hands `currentBubble` to `flightLayer`. Advances the queue: `nextBubble` slides to launcher position and becomes `currentBubble` (stays in `launcherLayer`, just repositioned); a new `nextBubble` is created via `spawnBubble()` (which calls `getNextColor()`) and added to `launcherLayer` at the preview position.
- **Aim guide** (`drawAimGuide`): traces dots every 16 px from barrel tip, simulating wall bounces against `wallLeft`/`wallRight`, fading out over 38 steps. Stops at `GRID_TOP_PAD`. Only called from `update()`, never from event handlers.
- **Physics** (`update(delta)`): advances position; reflects `vx` off `wallLeft` / `wallRight` using `Math.abs` (prevents tunnelling).
- **Landing triggers**: `shouldLand = true` when (a) `y - BUBBLE_RADIUS ≤ GRID_TOP_PAD` (top boundary), OR (b) any nearby occupied grid cell is within `2 × BUBBLE_RADIUS` of the bubble centre (checks `pixelToCell` + 6 hex neighbours each frame).
- **`landBubble(bubble, px, py)`**: removes bubble from `flightLayer`, calls `grid.findSnapCell()`, places bubble at snapped cell. Dispatches by `bubble.special`:
  - **bomb** → `handleBombEffect`: removes all non-stone bubbles within 2 hex rings (15 pts/bubble) then checks floating/win/lose.
  - **lightning** → `handleLightningEffect`: removes all non-stone bubbles in the landing row (15 pts/bubble) then checks floating/win/lose.
  - **colorBomb** → `handleColorBombEffect`: removes the bomb itself, finds nearest non-special neighbor's color, removes every non-stone bubble of that color from the entire board (15 pts/bubble) then checks floating/win/lose.
  - **normal / rainbow / frozen / stone** → `findCluster()`. If cluster ≥ 3: pre-existing frozen bubbles in the cluster (not the fired bubble) are "thawed" (swapped for a normal `Bubble(color)`) instead of popped; remaining non-frozen cells are popped (10 pts/bubble) if ≥ 3 remain; then `findFloating()` + `animateDrop()`. Discards bubble if no empty snap cell found. After every path checks win (`grid.isEmpty()`) and lose (`grid.hasBubbleBelowY(dangerY)`).
- **Win/lose** (`showResult(state)`): sets `gameState = state`, then calls `this.onGameOver?.(this.score, state)` — the scene itself does nothing else. The React canvas component (`BubbleShooterCanvas`) receives the callback, submits the score via `BubbleShooter.tsx`, and renders `<BubbleLeaderboardOverlay>` as a React overlay on top of the Pixi canvas.
- **`animateDrop(cells)`**: for each floating cell calls `grid.extractBubble()` (keeps view alive), moves view into `dropLayer`, then runs a GSAP tween — falls 520 px with `power2.in` easing, fades to alpha 0, slight random horizontal drift (±20 px) and stagger delay (0–80 ms) per bubble so cascades look natural. `onComplete` removes and destroys the view.
- **Scoring** (`addScore(points)`): adds to `this.score`, updates `scoreText.text`, fires a GSAP scale-bounce (`1.35 → 1.0`, 220 ms, `back.out`) so the number visually pops. Called twice per pop event — `cluster.length × 10` pts for the matched cluster, then `floating.length × 20` pts for any disconnected bubbles that drop.
- **HUD panel**: right-anchored `Text` objects (`anchor.set(1, 0)`) at `x = W - 14` so the score grows leftward as digits increase. "SCORE" label at 9 px (`#6699aa`), value at 15 px (`#ff6eb4`, game accent pink). Dark near-black background rect (`W - 190` to `W`, full `GRID_TOP_PAD` height) with left + bottom border strokes for definition.
- **Board-pressure advance** (`advanceBoard()`): called from `handleFire` when `shotsUntilAdvance` hits 0. Snaps `grid.container.y = -ROW_SPACING` (moves grid up visually), calls `grid.addTopRow(() => getNextColor())` (shifts all row data down by 1 and inserts a new row 0 with server-sourced colours, repositioning all bubble views), then GSAP animates `container.y → 0` over 0.45 s (`power2.inOut`) so the new row slides in from above and existing bubbles slide down. `onComplete` checks `hasBubbleBelowY(dangerY)` for a lose. Guarded by `gameState !== 'playing'`. Uses `gsap.killTweensOf(grid.container)` before each advance to prevent tween conflicts.
- **Pressure bar** (`updateAdvanceBar()`): clears and redraws `advanceBar` Graphics on every shot. Bar position: `y = GRID_TOP_PAD - BUBBLE_RADIUS - h - 2` (12 px from top of canvas) so it is always above the topmost bubble edge (`GRID_TOP_PAD - BUBBLE_RADIUS = 20`). Design: 6 px tall dark background track (full grid width) + colour-coded progress fill (blue → orange at 50 % → red at 75 %) + 7 tick-mark dividers (one per shot interval) + top border line. Rendered on the `advanceBar` layer which sits above `launcherLayer` so it is never obscured by bubbles.
- **One bubble in the air at a time** — `handleFire` returns early if `inFlight` is not null.
- `destroy()` removes `mousemove`, `click`, and `keydown` listeners.

**`entities/Bubble.ts`**
- `Bubble(color, special?)` — `color: BubbleColor`, `special?: SpecialType`.
- Normal bubbles: filled body from `COLOR_HEX`, specular highlight (upper-left, `alpha 0.28`), rim stroke (`alpha 0.25`).
- Special bubbles: filled body from `SPECIAL_COLOR_HEX`, reduced highlight (`alpha 0.22`), plus a type-specific icon drawn on top:
  - **bomb** — short gray fuse line + orange fuse-tip circle
  - **rainbow** — six concentric colored arcs (ROYGBV)
  - **colorBomb** — white 5-pointed star fill
  - **stone** — two dark crossed lines (X)
  - **frozen** — six-armed white asterisk (snowflake)
  - **lightning** — white Z-shaped zigzag bolt
- Both `color` and `special` are public fields readable by the scene for game logic.

**`entities/Launcher.ts`**
- `Launcher(x, y)` — fixed position container. Draws two-ring base (outer filled, inner stroke accent).
- `setAngle(angle)` — clears and redraws barrel as three lines: shadow offset, body (`#55aacc`, width 9), highlight stripe (width 3, `alpha 0.4`). Called every frame the mouse moves.

**`managers/GridManager.ts`**
- Owns the grid state as `GridCell[][] = { bubble: Bubble | null }`.
- **`rowPhase`** (`private rowPhase = 0`) — tracks how many rows have been prepended via `addTopRow`. Every function that depends on even/odd row parity uses `(row + rowPhase) % 2` instead of `row % 2` directly, so parity stays correct after each board-pressure advance.
- **`colsInRow(row)`** → `(row + rowPhase) % 2 === 0 ? COLS : COLS - 1` — even-phase rows have 11 cols, odd-phase rows have 10.
- **`cellToPixel(col, row)`** → `{ x, y }`: odd-phase rows shifted right by `BUBBLE_RADIUS`, even-phase rows unshifted.
- **`pixelToCell(px, py)`** → `{ col, row }`: inverse of above; uses `rowPhase` offset before rounding; clamps to valid bounds.
- **`getCell(col, row)`** → `GridCell | null`.
- **`place(col, row, bubble)`** → positions bubble view and adds to `container`. Creates the row array if it doesn't exist yet (handles bubbles landing below the initial grid).
- **`populate(layout)`** → fills grid from a 2-D `BubbleColor | null` array.
- **`getHexNeighbors(col, row)`** → up to 6 adjacent cells using offset-row formula with `rowPhase`: `const isOdd = (row + rowPhase) % 2 === 1`. Even-phase rows shift col by −1 for upper/lower-left; odd-phase rows shift col by +1 for upper/lower-right. Filters to valid grid bounds.
- **`findSnapCell(px, py)`** → nearest empty cell among primary + 6 neighbours that is **connected to the grid** — candidate must be row 0 (ceiling) OR have at least one occupied hex neighbour. Returns `null` if no connected empty cell found. This prevents bubbles fired through gaps from floating in mid-air: a bubble that reaches the top through an empty column with no row-0 bubble nearby is discarded.
- **`findCluster(col, row)`** → BFS flood-fill collecting all same-colour connected cells. Special rules:
  - **stone** at start cell → returns `[]` immediately (immune).
  - **bomb / lightning / colorBomb** at start cell → returns `[]` (scene handles these separately).
  - **rainbow** at start cell → inherits colour from first non-special occupied neighbour; acts as wildcard in BFS (any rainbow bubble in the chain counts as matching).
  - **frozen** bubbles with a matching colour are included in the cluster; the scene separates them for first-hit unfreeze logic.
- **`findFloating()`** → BFS seeded from every occupied cell in row 0; returns all occupied cells NOT reachable from the top (disconnected after a pop).
- **`removeBubble(col, row)`** → removes Pixi view, destroys it, nulls the cell. Used for instant removal (popped cluster).
- **`extractBubble(col, row)`** → removes bubble from grid state and grid container but returns the `Bubble` object alive so the caller can animate it. Used by `animateDrop`.
- **`getBoardColors()`** → scans all occupied cells, returns a deduplicated `BubbleColor[]` of every color currently on the board. Falls back to an empty array (server handles the fallback to all 6 colors). Called by `BubbleShooterCanvas` when sending `'request_colors'` to the server so the server biases new bubbles toward colors already on the board.
- **`getBombTargets(col, row, rings)`** → BFS out to `rings` hex steps; returns every occupied non-stone cell in range (including the starting cell itself). Used by `handleBombEffect`.
- **`getCellsInRow(row)`** → returns coordinates of every occupied non-stone cell in the given grid row. Used by `handleLightningEffect`.
- **`getCellsOfColor(color)`** → scans entire grid; returns coordinates of every occupied non-stone bubble whose colour matches `color`. Used by `handleColorBombEffect`.
- **`hasBubbleBelowY(thresholdY)`** → `true` if any occupied cell's pixel y ≥ `thresholdY`. Used after each landing to detect the lose condition (bubble reached the danger line).
- **`isEmpty()`** → `true` if no bubble remains in the grid (win condition).
- **`addTopRow(getColor)`** → board-pressure advance. Shifts every existing row down by 1 in the `grid[][]` array (iterates end→start to avoid reference aliasing), repositions all shifted bubbles to their new `cellToPixel(c, r)` positions, then **flips `rowPhase = (rowPhase + 1) % 2`** so that all parity-dependent functions remain correct after the shift, then creates a fresh row 0 by calling `getColor()` for each cell and adding the new `Bubble` views to `container`. The scene offsets `container.y = -ROW_SPACING` before calling this so that visually the grid is unchanged; animating `container.y → 0` afterward creates the slide-in effect.

**`data/levels.ts`**
- `LEVEL_1`: 5-row hardcoded starter layout. **Dead code** — no longer imported anywhere. The initial board is now generated dynamically via `getNextColor()` in `BubbleShooterScene`.

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
- Registers `bubble_shooter_room` → `BubbleShooterRoom`.

**`rooms/BubbleShooterRoom.ts`**
- `maxClients = 1` — single-player room.
- Stateless: no `RoomState` schema. Communication is purely message-based.
- Handles `'request_colors'` message `{ count: number; boardColors: string[] }`:
  - If `boardColors` is non-empty, samples from it (biases toward colors already on the board).
  - Otherwise samples from `ALL_COLORS` (`red | blue | green | yellow | purple | orange`).
  - Responds with `client.send('colors', string[])`.

**`schema/BubbleShooterState.ts`**
- Defines `BubbleShooterState extends Schema` with `@type(['string']) colorQueue = new ArraySchema<string>()`.
- **Dead code** — not used. `ArraySchema` patches require matching schema registration on the client side; switched to plain message-based approach instead.

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
| Bubble Shooter — grid snap | ✓ `findSnapCell` + `place` wire up on landing |
| Bubble Shooter — match & pop | ✓ `findCluster` BFS pops clusters of 3+ |
| Bubble Shooter — floating drop | ✓ `findFloating` + `animateDrop`: disconnected bubbles fall with GSAP gravity animation |
| Bubble Shooter — scoring | ✓ `addScore()` — cluster pop ×10 pts, floating drop ×20 pts; HUD panel top-right with scale-bounce animation |
| Bubble Shooter — win / lose | ✓ Win on `grid.isEmpty()`; lose on `hasBubbleBelowY(dangerY)`; calls `onGameOver(score, state)` → React shows `<BubbleLeaderboardOverlay>` |
| Bubble Shooter — next preview | ✓ `nextBubble` rendered at `launcherX + 65` with "NEXT" label; queue advances on every fire |
| Bubble Shooter — colour sourcing | ✓ Server-driven via `BubbleShooterRoom`. Client sends `'request_colors'` with current `boardColors`; server biases selection toward those colors. Client maintains a local queue consumed by `getNextColor()`. |
| Bubble Shooter — special bubbles | ✓ 6 types: bomb (2-ring blast), rainbow (wildcard), colorBomb (wipe a color), stone (immune), frozen (2-hit), lightning (clear row). Spawn at 15 % via `spawnBubble()` |
| Bubble Shooter — board pressure | ✓ New row slides in from top every 8 shots (`ADVANCE_EVERY`). Progress bar (above bubbles, z-ordered above launcherLayer) shows countdown with colour ramp and per-shot tick marks |
| Bubble Shooter — leaderboard | ✓ `BubbleLeaderboardOverlay` (pink `#ff6eb4` accent, top 10, current user highlighted yellow). `pages/BubbleShooter.tsx` submits score via `submitScore('bubble-shooter', …)`. |

---

## Key Design Patterns

- **Scene pattern** — `SceneManager` manages one active `Scene` at a time on the Pixi stage. Each scene implements `{ view: Container; update(delta): void; destroy(): void }`.
- **GSAP for all async timing** — `gsap.delayedCall(seconds, fn)` replaces every `setTimeout`. Store the returned tween as a field and call `.kill()` in `destroy()` to prevent callbacks firing on dead scenes.
- **AudioContext autoplay guard** — `RetroAudio.getCtx()` returns `null` until the context is `'running'`; all sound methods guard with `if (!ctx) return`. No user-gesture prompt, no console error.
- **Font FOUT fix** — three-layer: `<link rel="preload">` in HTML, `display=block` on the Google Fonts stylesheet, `document.fonts.load()` in `main.tsx` before React mounts.
- **Centralised strings** — all UI text in `data/strings.json`, imported as `T`. Never inline string literals in component/scene files. This includes default display values (e.g. `T.bubble.scoreDefault = "0"`), not just labels.
- **Centralised style constants** — repeated style values (font family, shared colours) live in `constants.ts`, not inlined per `Text` node. All bubble-shooter `Text` objects use `HUD_FONT` from `constants.ts` for their `fontFamily`.
- **ErrorBoundary on canvas** — both Pixi and Three throw on WebGL failure; `ErrorBoundary` catches.
- **Singleton clients** — `ColyseusClient`, `supabase` are module-level singletons.
- **Ref-stable callbacks** — `PixiCanvas` uses `onGameOverRef` to avoid stale closure in game loop.
- **Inline styles** — all styling via `React.CSSProperties` const objects; no CSS modules or utility classes.
- **Dark theme** — background `#0f0f0f`, accent green `#00ff99`, borders `#222`, text white/gray.
