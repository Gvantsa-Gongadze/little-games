// Grid
export const BLOCK_COLS   = 7
export const BLOCK_W      = 60
export const BLOCK_H      = 44       // taller for pill / blob shape
export const BLOCK_GAP    = 6

// Derived
export const GRID_W = BLOCK_COLS * (BLOCK_W + BLOCK_GAP) - BLOCK_GAP   // 456 px

// Vertical layout
export const GRID_TOP_PAD  = 90
export const LAUNCHER_PAD  = 80

// Ball
export const BALL_RADIUS  = 10
export const BALL_SPEED   = 14

// HUD
export const HUD_FONT = '"Press Start 2P"'
export const ACCENT   = 0xff6600

// Warm wood palette
export const WOOD_DARK  = 0x6b3a18
export const WOOD_MID   = 0x9a6030
export const WOOD_LIGHT = 0xc8844a

// Block colour palette matching reference vibrant tones
export const BLOCK_COLORS = [
  0xee3333,  // red
  0x3366ee,  // blue
  0x9933cc,  // purple
  0x223355,  // dark navy
  0xcccccc,  // light / near-white
  0xffcc22,  // yellow
  0x22bb55,  // green
] as const

export interface LevelConfig {
  level: number
  rows:  { hp: number; color: number }[][]
}
