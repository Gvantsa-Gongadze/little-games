export interface LevelConfig {
  level:       number
  enemy_count: number
  enemy_speed: number
  enemy_hp:    number
  boss:        boolean
  pattern:     'swarm' | 'grid' | 'wave'
}

export const PLAYER_SPEED  = 4      // px/frame
export const BULLET_SPEED  = 10
export const FIRE_RATE     = 12     // frames between shots
export const PLAYER_LIVES  = 3
export const HUD_FONT      = '"Press Start 2P"'
export const ACCENT        = 0xff6600

export const BRICK_W    = 18
export const BRICK_H    = 18
export const BRICK_GAP  = 4
export const BRICK_COLS = 14
export const BRICK_ROWS = 12

// Level 1 is fixed; all other levels draw randomly from ALL_BRICK_COLORS
export const LEVEL1_BRICK_COLORS = [0xff69b4, 0x3498db, 0xe74c3c, 0x9b59b6]  // pink, blue, red, purple

export const ALL_BRICK_COLORS = [
  0xff69b4,  // pink
  0x3498db,  // blue
  0xe74c3c,  // red
  0x9b59b6,  // purple
  0x2ecc71,  // green
  0xf1c40f,  // yellow
  0xe67e22,  // orange
  0x00bcd4,  // cyan
]

export function levelBrickColors(level: number): number[] {
  if (level === 1) return LEVEL1_BRICK_COLORS
  // each level unlocks one more color from the pool, then shuffles a random subset
  const pool  = ALL_BRICK_COLORS.slice(0, Math.min(4 + (level - 1), ALL_BRICK_COLORS.length))
  const count = Math.min(4 + Math.floor((level - 1) / 2), pool.length)
  return [...pool].sort(() => Math.random() - 0.5).slice(0, count)
}

export function levelClearBonus(level: number): number {
  return level * 500
}