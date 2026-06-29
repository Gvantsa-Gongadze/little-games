// Grid
export const BLOCK_COLS   = 7
export const BLOCK_W      = 60
export const BLOCK_H      = 40
export const BLOCK_GAP    = 6

// Derived
export const GRID_W = BLOCK_COLS * (BLOCK_W + BLOCK_GAP) - BLOCK_GAP   // 456 px

// Vertical layout
export const GRID_TOP_PAD  = 90    // px from top to first block row
export const LAUNCHER_PAD  = 90    // px from bottom to launcher centre

// Ball
export const BALL_RADIUS  = 8
export const BALL_SPEED   = 14     // px per tick (at deltaTime=1)

// HUD
export const HUD_FONT = '"Press Start 2P"'
export const ACCENT   = 0xff6600

// Block colour palette
export const BLOCK_COLORS = [
  0xff3333,  // red
  0xff8800,  // orange
  0xffcc00,  // yellow
  0x33cc66,  // green
  0x33aaff,  // blue
  0xaa44ff,  // purple
  0xff44aa,  // pink
] as const

export interface LevelConfig {
  level: number
  rows:  { hp: number; color: number }[][]
}
