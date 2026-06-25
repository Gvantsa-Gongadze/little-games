export const BUBBLE_RADIUS      = 20
export const COL_SPACING        = BUBBLE_RADIUS * 2            // 40px  centre-to-centre horizontal
export const ROW_SPACING        = BUBBLE_RADIUS * Math.sqrt(3) // ≈34.6px centre-to-centre vertical
export const COLS               = 11                           // bubbles per even row
export const INITIAL_ROWS       = 5                            // rows pre-filled at level start
export const GRID_TOP_PAD       = 40                           // px from top of canvas to row 0

export const BUBBLE_SPEED       = 12                           // px per frame at deltaTime=1
export const LAUNCHER_Y_OFFSET  = 70                           // px from bottom of screen to launcher centre
export const BARREL_LENGTH      = 44                           // px from launcher centre to barrel tip
export const MIN_AIM_ANGLE      = 18 * (Math.PI / 180)        // minimum angle from horizontal (prevents near-horizontal shots)

export const HUD_FONT = '"Press Start 2P"'   // CSS font-family for all in-game Text nodes

export type SpecialType = 'bomb' | 'rainbow' | 'colorBomb' | 'stone' | 'frozen' | 'lightning'

export const SPECIAL_SPAWN_RATE = 0.15   // 15 % chance a queued bubble is special

export const SPECIAL_COLOR_HEX: Record<SpecialType, number> = {
  bomb:      0x2c2c2c,
  rainbow:   0xeeeeee,
  colorBomb: 0xf4d03f,
  stone:     0x7f8c8d,
  frozen:    0xaed6f1,
  lightning: 0xf7dc6f,
}

export type BubbleColor = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange'

export const COLOR_HEX: Record<BubbleColor, number> = {
  red:    0xe74c3c,
  blue:   0x3498db,
  green:  0x2ecc71,
  yellow: 0xf1c40f,
  purple: 0x9b59b6,
  orange: 0xe67e22,
}