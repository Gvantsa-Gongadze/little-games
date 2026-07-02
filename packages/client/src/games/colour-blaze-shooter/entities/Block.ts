import { Container, Graphics, Text } from 'pixi.js'
import { BLOCK_W, BLOCK_H, HUD_FONT } from '../constants'

const FONT = `${HUD_FONT}, monospace`

export class Block {
  view:  Container
  x:     number
  y:     number
  hp:    number
  maxHp: number
  color: number

  private bg:    Graphics
  private label: Text

  constructor(x: number, y: number, hp: number, color: number) {
    this.x     = x
    this.y     = y
    this.hp    = hp
    this.maxHp = hp
    this.color = color

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

  // Returns true when the block is destroyed.
  hit(): boolean {
    if (this.hp <= 0) return true
    this.hp--
    this.draw()
    return this.hp === 0
  }

  private draw() {
    const pct = this.hp / this.maxHp
    const g   = this.bg
    g.clear()

    // Drop shadow
    g.roundRect(2, 3, BLOCK_W, BLOCK_H, 6).fill({ color: 0x000000, alpha: 0.25 })
    // Body — desaturates as HP drains
    g.roundRect(0, 0, BLOCK_W, BLOCK_H, 6).fill({ color: this.color, alpha: 0.42 + 0.58 * pct })
    // Specular highlight
    g.roundRect(3, 3, BLOCK_W - 6, Math.round(BLOCK_H * 0.32), 4)
      .fill({ color: 0xffffff, alpha: 0.18 })

    this.label.text  = String(this.hp)
    this.label.alpha = this.hp > 0 ? 1 : 0
  }
}
