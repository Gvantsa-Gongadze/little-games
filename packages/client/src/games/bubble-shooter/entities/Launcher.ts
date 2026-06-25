import { Container, Graphics } from 'pixi.js'
import { BUBBLE_RADIUS, BARREL_LENGTH } from '../constants'

export class Launcher {
  readonly view  = new Container()
  private barrel = new Graphics()

  constructor(x: number, y: number) {
    this.view.x = x
    this.view.y = y

    const base = new Graphics()
    // outer ring
    base.circle(0, 0, BUBBLE_RADIUS + 10).fill({ color: 0x1a2c3d })
    base.circle(0, 0, BUBBLE_RADIUS + 10).stroke({ color: 0x3388aa, width: 2 })
    // inner ring
    base.circle(0, 0, BUBBLE_RADIUS + 4).stroke({ color: 0x55aacc, alpha: 0.4, width: 1 })

    // barrel rendered on top of base
    this.view.addChild(base, this.barrel)
    this.setAngle(-Math.PI / 2)
  }

  setAngle(angle: number) {
    this.barrel.clear()
    const ex = Math.cos(angle) * BARREL_LENGTH
    const ey = Math.sin(angle) * BARREL_LENGTH
    // barrel shadow
    this.barrel.moveTo(2, 2).lineTo(ex + 2, ey + 2).stroke({ color: 0x000000, alpha: 0.3, width: 10 })
    // barrel body
    this.barrel.moveTo(0, 0).lineTo(ex, ey).stroke({ color: 0x55aacc, width: 9 })
    // barrel highlight
    this.barrel
      .moveTo(Math.cos(angle - 0.3) * 4, Math.sin(angle - 0.3) * 4)
      .lineTo(ex + Math.cos(angle - 0.3) * 4, ey + Math.sin(angle - 0.3) * 4)
      .stroke({ color: 0xaaddff, alpha: 0.4, width: 3 })
  }
}
