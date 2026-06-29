import { Container, Graphics, Text } from 'pixi.js'
import { BLOCK_W, BLOCK_H, HUD_FONT } from '../constants'

const FONT = `${HUD_FONT}, monospace`

export class Block {
  view:   Container
  x:      number
  y:      number
  hp:     number
  maxHp:  number
  color:  number

  private bg:    Graphics
  private label: Text

  constructor(x: number, y: number, hp: number, color: number) {
    this.x     = x
    this.y     = y
    this.hp    = hp
    this.maxHp = hp
    this.color = color

    this.view = new Container()
    this.view.position.set(x, y)

    this.bg = new Graphics()

    this.label = new Text({
      text:  String(hp),
      style: { fontFamily: FONT, fontSize: 13, fill: '#ffffff' },
    })
    this.label.anchor.set(0.5)
    this.label.position.set(BLOCK_W / 2, BLOCK_H / 2)

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
    g.roundRect(2, 3, BLOCK_W, BLOCK_H, 8).fill({ color: 0x000000, alpha: 0.28 })
    // Body — desaturates as HP drains
    g.roundRect(0, 0, BLOCK_W, BLOCK_H, 8).fill({ color: this.color, alpha: 0.35 + 0.65 * pct })
    // Top specular highlight
    g.roundRect(5, 5, BLOCK_W - 10, BLOCK_H * 0.32, 4).fill({ color: 0xffffff, alpha: 0.22 * pct })
    // Bottom shadow strip
    g.roundRect(5, BLOCK_H * 0.7, BLOCK_W - 10, BLOCK_H * 0.22, 4).fill({ color: 0x000000, alpha: 0.18 })

    this.label.text  = String(this.hp)
    this.label.alpha = this.hp > 0 ? 1 : 0
  }
}
