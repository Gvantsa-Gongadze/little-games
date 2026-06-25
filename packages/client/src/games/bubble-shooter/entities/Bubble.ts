import { Container, Graphics } from 'pixi.js'
import { BUBBLE_RADIUS, COLOR_HEX, type BubbleColor } from '../constants'

export class Bubble {
  view:  Container
  color: BubbleColor

  constructor(color: BubbleColor) {
    this.color = color
    this.view  = new Container()
    this.buildGraphics()
  }

  private buildGraphics() {
    const g = new Graphics()
    const c = COLOR_HEX[this.color]

    // body
    g.circle(0, 0, BUBBLE_RADIUS).fill({ color: c })
    // specular highlight (upper-left)
    g.circle(-BUBBLE_RADIUS * 0.28, -BUBBLE_RADIUS * 0.28, BUBBLE_RADIUS * 0.32)
      .fill({ color: 0xffffff, alpha: 0.28 })
    // rim
    g.circle(0, 0, BUBBLE_RADIUS)
      .stroke({ color: 0x000000, alpha: 0.25, width: 1.5 })

    this.view.addChild(g)
  }
}