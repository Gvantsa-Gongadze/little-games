import { Container, Graphics, Text } from 'pixi.js'
import { BLOCK_W, BLOCK_H, HUD_FONT, type SpecialBlockType } from '../constants'

const FONT = `${HUD_FONT}, monospace`

// Special body colours — echoes the bubble shooter's SPECIAL_COLOR_HEX language
const BOMB_BODY  = 0x2c2c2c
const LASER_BODY = 0xf4d03f
const STEEL_BODY = 0x7f8c8d

export class Block {
  view:  Container
  x:     number
  y:     number
  hp:    number
  maxHp: number
  color: number
  special?: SpecialBlockType

  private bg:     Graphics
  private label:  Text
  private danger = false

  constructor(x: number, y: number, hp: number, color: number, special?: SpecialBlockType) {
    this.x       = x
    this.y       = y
    this.hp      = hp
    this.maxHp   = hp
    this.color   = color
    this.special = special

    this.view = new Container()
    this.view.label = 'block'
    this.view.position.set(x, y)

    this.bg = new Graphics()
    this.bg.label = 'blockBody'

    this.label = new Text({
      text:  String(hp),
      style: { fontFamily: FONT, fontSize: 13, fill: '#ffffff' },
    })
    this.label.anchor.set(0.5)
    this.label.position.set(BLOCK_W / 2, BLOCK_H / 2)
    this.label.label = 'blockHp'

    this.view.addChild(this.bg, this.label)
    this.draw()
  }

  // Returns true when the block is destroyed. Steel is indestructible.
  hit(): boolean {
    if (this.special === 'steel') return false
    if (this.hp <= 0) return true
    this.hp--
    this.draw()
    return this.hp === 0
  }

  // Red warning border when the block is one descent from the lose line.
  setDanger(on: boolean) {
    if (this.danger === on) return
    this.danger = on
    this.draw()
  }

  private draw() {
    const pct = this.hp / this.maxHp
    const g   = this.bg
    g.clear()

    const body =
      this.special === 'bomb'  ? BOMB_BODY  :
      this.special === 'laser' ? LASER_BODY :
      this.special === 'steel' ? STEEL_BODY :
      this.color
    const bodyAlpha = this.special === 'steel' ? 1 : 0.42 + 0.58 * pct

    // Drop shadow
    g.roundRect(2, 3, BLOCK_W, BLOCK_H, 6).fill({ color: 0x000000, alpha: 0.25 })
    // Body — desaturates as HP drains (steel stays solid)
    g.roundRect(0, 0, BLOCK_W, BLOCK_H, 6).fill({ color: body, alpha: bodyAlpha })
    // Specular highlight
    g.roundRect(3, 3, BLOCK_W - 6, Math.round(BLOCK_H * 0.32), 4)
      .fill({ color: 0xffffff, alpha: 0.18 })

    // Type icon
    if (this.special === 'bomb') {
      g.circle(13, 13, 5).fill({ color: 0x111111 })
      g.moveTo(15, 9).lineTo(20, 5).stroke({ color: 0x888888, width: 2 })
      g.circle(20, 5, 2).fill({ color: 0xff8800 })
    } else if (this.special === 'laser') {
      g.moveTo(4, BLOCK_H / 2).lineTo(BLOCK_W - 4, BLOCK_H / 2)
        .stroke({ color: 0xffffff, width: 2, alpha: 0.7 })
      g.moveTo(BLOCK_W / 2, 4).lineTo(BLOCK_W / 2, BLOCK_H - 4)
        .stroke({ color: 0xffffff, width: 2, alpha: 0.7 })
    } else if (this.special === 'steel') {
      g.moveTo(6, 6).lineTo(BLOCK_W - 6, BLOCK_H - 6).stroke({ color: 0x4a545a, width: 3 })
      g.moveTo(BLOCK_W - 6, 6).lineTo(6, BLOCK_H - 6).stroke({ color: 0x4a545a, width: 3 })
      for (const [rx, ry] of [[6, 6], [BLOCK_W - 6, 6], [6, BLOCK_H - 6], [BLOCK_W - 6, BLOCK_H - 6]] as const) {
        g.circle(rx, ry, 2).fill({ color: 0x55606a })
      }
    }

    if (this.danger) {
      g.roundRect(0, 0, BLOCK_W, BLOCK_H, 6).fill({ color: 0xff0000, alpha: 0.14 })
      g.roundRect(0, 0, BLOCK_W, BLOCK_H, 6).stroke({ color: 0xff3333, width: 3 })
    }

    this.label.text  = String(this.hp)
    this.label.alpha = this.hp > 0 && this.special !== 'steel' ? 1 : 0
  }
}
