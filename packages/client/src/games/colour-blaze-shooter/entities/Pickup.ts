import { Container, Graphics, Text } from 'pixi.js'
import { PICKUP_RADIUS, HUD_FONT, ACCENT } from '../constants'
import T from '@/data/strings.json'

const FONT = `${HUD_FONT}, monospace`

// +1 ball pickup — floats in an empty grid cell, collected on ball contact.
export class Pickup {
  view: Container
  x: number   // centre
  y: number   // centre

  constructor(x: number, y: number) {
    this.x = x
    this.y = y

    this.view = new Container()
    this.view.label = 'pickup'
    this.view.position.set(x, y)

    const g = new Graphics()
    g.label = 'pickupBody'
    g.circle(0, 0, PICKUP_RADIUS + 4).stroke({ color: ACCENT, width: 2, alpha: 0.4 })
    g.circle(0, 0, PICKUP_RADIUS).fill({ color: 0x222222 })
    g.circle(0, 0, PICKUP_RADIUS).stroke({ color: ACCENT, width: 2 })

    const label = new Text({
      text:  T.colourBlaze.plusOne,
      style: { fontFamily: FONT, fontSize: 8, fill: '#ffcc44' },
    })
    label.anchor.set(0.5)
    label.label = 'pickupLabel'

    this.view.addChild(g, label)
  }
}
