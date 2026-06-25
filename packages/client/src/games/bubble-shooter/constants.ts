export const BUBBLE_RADIUS  = 20
export const COL_SPACING    = BUBBLE_RADIUS * 2          // 40px  centre-to-centre horizontal
export const ROW_SPACING    = BUBBLE_RADIUS * Math.sqrt(3) // ≈34.6px centre-to-centre vertical
export const COLS           = 11                          // bubbles per even row
export const INITIAL_ROWS   = 5                           // rows pre-filled at level start
export const GRID_TOP_PAD   = 40                          // px from top of canvas to row 0

export type BubbleColor = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange'

export const COLOR_HEX: Record<BubbleColor, number> = {
  red:    0xe74c3c,
  blue:   0x3498db,
  green:  0x2ecc71,
  yellow: 0xf1c40f,
  purple: 0x9b59b6,
  orange: 0xe67e22,
}