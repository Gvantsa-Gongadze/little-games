# little-games — client

React 19 + TypeScript + Vite frontend for the Little Games platform.

## Stack

| | |
|---|---|
| Framework | React 19 |
| Bundler | Vite 8 |
| 2D engine | Pixi.js v8 |
| 3D engine | Three.js r168 |
| Animation | GSAP |
| Auth & DB | Supabase JS |
| Multiplayer | colyseus.js |

## Dev

```bash
pnpm dev:client   # http://localhost:5173
pnpm typecheck    # tsc -b
pnpm lint         # eslint
pnpm build:client # production build → dist/
```

## Environment variables

Create `packages/client/.env`:

```env
VITE_SERVER_URL=ws://localhost:2567
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

## Project structure

```
src/
├── main.tsx              # entry — waits for Press Start 2P font, then mounts
├── App.tsx               # React Router routes
├── pages/                # one file per route
├── components/           # shared UI (BackButton, ErrorBoundary, GameCard, …)
├── engine/               # SceneManager, Keyboard, ColyseusClient
├── games/
│   ├── asteroids/        # AsteroidsScene + entities + audio
│   ├── bubble-shooter/   # BubbleShooterScene + GridManager + entities
│   ├── arena-2d/         # PixiCanvas + MenuScene + GameScene
│   └── cube-3d/          # ThreeCanvas + CubeScene
├── hooks/                # useAuth
├── lib/                  # supabase.ts, scores.ts
└── data/                 # strings.json, games.ts
```

See the root [`CLAUDE.md`](../../CLAUDE.md) for a full file-by-file reference.
