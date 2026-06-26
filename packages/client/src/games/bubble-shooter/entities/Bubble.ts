import { Container, Graphics } from 'pixi.js'
import {
  BUBBLE_RADIUS, COLOR_HEX, SPECIAL_COLOR_HEX,
  type BubbleColor, type SpecialType,
} from '../constants'

export class Bubble {
  view:     Container
  color:    BubbleColor
  special?: SpecialType

  constructor(color: BubbleColor, special?: SpecialType) {
    this.color   = color
    this.special = special
    this.view    = new Container()
    this.buildGraphics()
  }

  private buildGraphics() {
    const g = new Graphics()
    const r = BUBBLE_RADIUS

    if (this.special) {
      const base = SPECIAL_COLOR_HEX[this.special]
      g.circle(0, 0, r).fill({ color: base })
      g.circle(-r * 0.28, -r * 0.28, r * 0.32).fill({ color: 0xffffff, alpha: 0.22 })
      g.circle(0, 0, r).stroke({ color: 0x000000, alpha: 0.3, width: 1.5 })
      this.drawIcon(g, r)
    } else {
      const c = COLOR_HEX[this.color]
      g.circle(0, 0, r).fill({ color: c })
      g.circle(-r * 0.28, -r * 0.28, r * 0.32).fill({ color: 0xffffff, alpha: 0.28 })
      g.circle(0, 0, r).stroke({ color: 0x000000, alpha: 0.25, width: 1.5 })
    }

    this.view.addChild(g)
  }

  private drawIcon(g: Graphics, r: number) {
    switch (this.special) {
      case 'bomb':
        g.moveTo(3, -r * 0.56).lineTo(7, -r * 0.76)
          .stroke({ color: 0x888888, width: 2 })
        g.circle(7.5, -r * 0.8, 3.5).fill({ color: 0xff6600 })
        break

      case 'rainbow': {
        const cols = [0xe74c3c, 0xe67e22, 0xf1c40f, 0x2ecc71, 0x3498db, 0x9b59b6]
        cols.forEach((c, i) =>
          g.arc(0, 0, r * (0.26 + i * 0.09), -Math.PI * 0.72, Math.PI * 0.72)
            .stroke({ color: c, width: 2, alpha: 0.88 }),
        )
        break
      }

      case 'colorBomb': {
        // 5-pointed star
        const pts: [number, number][] = []
        for (let i = 0; i < 10; i++) {
          const a  = (i * Math.PI) / 5 - Math.PI / 2
          const ri = i % 2 === 0 ? r * 0.55 : r * 0.22
          pts.push([Math.cos(a) * ri, Math.sin(a) * ri])
        }
        g.moveTo(pts[0][0], pts[0][1])
        for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1])
        g.closePath().fill({ color: 0xffffff, alpha: 0.75 })
        break
      }

      case 'stone':
        g.moveTo(-r * 0.38, -r * 0.38).lineTo(r * 0.38, r * 0.38)
          .stroke({ color: 0x4a4a4a, width: 3.5 })
        g.moveTo(r * 0.38, -r * 0.38).lineTo(-r * 0.38, r * 0.38)
          .stroke({ color: 0x4a4a4a, width: 3.5 })
        break

      case 'frozen':
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3
          g.moveTo(0, 0)
            .lineTo(Math.cos(a) * r * 0.58, Math.sin(a) * r * 0.58)
            .stroke({ color: 0xffffff, alpha: 0.85, width: 2.5 })
        }
        break

      case 'lightning':
        g.moveTo(5, -r * 0.65)
          .lineTo(-2, -r * 0.05)
          .lineTo(4, -r * 0.05)
          .lineTo(-3, r * 0.65)
          .stroke({ color: 0xffffff, alpha: 0.9, width: 2.5 })
        break
    }
  }
}
