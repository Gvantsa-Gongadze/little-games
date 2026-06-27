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

export function levelClearBonus(level: number): number {
  return level * 500
}