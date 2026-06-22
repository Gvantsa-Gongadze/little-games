import { Container, Graphics } from 'pixi.js'

export type PowerUpType = 'tripleShot' | 'shield' | 'extraLife'

const COLOR: Record<PowerUpType, number> = {
  tripleShot: 0x00ffff,
  shield:     0x4499ff,
  extraLife:  0xffdd00,
}

// Drop chances per asteroid size (0 = never)
export const DROP_CHANCE: Record<string, number> = {
  large:  0.20,
  medium: 0.30,
  small:  0,
}

const TYPES: PowerUpType[] = ['tripleShot', 'shield', 'extraLife']

export function randomType(): PowerUpType {
  return TYPES[Math.floor(Math.random() * TYPES.length)]
}

export class PowerUp {
  view     = new Container()
  x:       number
  y:       number
  radius   = 14
  type:    PowerUpType
  lifetime = 600   // ~10 s at 60 fps

  private inner: Graphics
  private outer: Graphics

  constructor(type: PowerUpType, x: number, y: number) {
    this.type = type
    this.x    = x
    this.y    = y

    const color = COLOR[type]

    // rotating outer diamond
    this.outer = new Graphics()
      .poly([0, -14, 14, 0, 0, 14, -14, 0])
      .stroke({ color, width: 1.5 })

    // inner symbol per type
    this.inner = new Graphics()
    if (type === 'tripleShot') {
      for (const dx of [-5, 0, 5])
        this.inner.circle(dx, 0, 2.5).fill(color)
    } else if (type === 'shield') {
      this.inner.circle(0, 0, 6).stroke({ color, width: 2 })
    } else {
      // extra life — mini ship triangle
      this.inner
        .moveTo(0, -7).lineTo(5, 5).lineTo(0, 2).lineTo(-5, 5).lineTo(0, -7)
        .stroke({ color, width: 1.5 })
    }

    this.view.addChild(this.outer, this.inner)
    this.view.x = x
    this.view.y = y
  }

  update(delta: number) {
    this.lifetime     -= delta
    this.outer.rotation += 0.04 * delta

    // pulse alpha, fade out in last 120 frames
    const fadeFactor = this.lifetime < 120 ? this.lifetime / 120 : 1
    this.view.alpha   = fadeFactor * (0.65 + Math.sin(Date.now() / 180) * 0.25)

    this.view.x = this.x
    this.view.y = this.y
  }

  get expired() { return this.lifetime <= 0 }
}
