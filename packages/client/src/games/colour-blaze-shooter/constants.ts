export const BLOCK_COLS   = 7
export const BLOCK_W      = 60      // px
export const BLOCK_H      = 40      // px
export const BLOCK_GAP    = 6       // px between blocks
export const GRID_W       = BLOCK_COLS * (BLOCK_W + BLOCK_GAP) - BLOCK_GAP   // 456 px
export const GRID_TOP_PAD = 90      // px from top of screen to first block row
export const LAUNCHER_PAD = 80      // px from bottom of screen to launcher centre
export const BALL_RADIUS  = 8       // px
export const BALL_SPEED   = 14      // px per tick at deltaTime=1
export const MIN_AIM_ANGLE = Math.PI / 18   // 10° — minimum aim angle from horizontal

export const ROW_FILL_RATE = 0.7    // chance each new-row cell gets a block (min 1 per row)
export const PICKUP_CHANCE = 0.25   // chance an empty new-row cell gets a +1 ball pickup
export const PICKUP_RADIUS = 10     // px
export const MAX_BALLS     = 20     // volley size cap
export const FAST_FORWARD  = 2.5    // ball-speed multiplier while fast-forward is active

export const GAME_ID  = 'colour-blaze-shooter'   // Supabase game key (scores + progress)
export const HUD_FONT = '"Press Start 2P"'
export const ACCENT   = 0xff6600

export const BLOCK_COLORS = [
  0xff3333,   // red
  0xff8800,   // orange
  0xffcc00,   // yellow
  0x33cc66,   // green
  0x33aaff,   // blue
  0xaa44ff,   // purple
  0xff44aa,   // pink
] as const

export interface LevelConfig {
  level: number
  rows: ({ hp: number; color: number } | null)[][]   // null = gap in the row
}
