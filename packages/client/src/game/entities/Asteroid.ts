import { Graphics } from 'pixi.js'

export type AsteroidSize = 'large' | 'medium' | 'small'

const RADIUS: Record<AsteroidSize, number> = { large: 45, medium: 25, small: 13 }
const SPEED:  Record<AsteroidSize, number> = { large: 1.2, medium: 1.8, small: 2.8 }

export class Asteroid {
  view:   Graphics
  x:      number
  y:      number
  vx:     number
  vy:     number
  radius: number
  size:   AsteroidSize

  constructor(size: AsteroidSize, x: number, y: number, angle?: number) {
    this.size   = size
    this.x      = x
    this.y      = y
    this.radius = RADIUS[size]

    const a  = angle ?? Math.random() * Math.PI * 2
    const sp = SPEED[size] * (0.8 + Math.random() * 0.4)
    this.vx  = Math.cos(a) * sp
    this.vy  = Math.sin(a) * sp

    this.view = this.buildShape()
  }

  private buildShape(): Graphics {
    const r      = this.radius
    const sides  = 8 + Math.floor(Math.random() * 4)
    const points: number[] = []

    for (let i = 0; i < sides; i++) {
      const a    = (i / sides) * Math.PI * 2
      const dist = r * (0.75 + Math.random() * 0.35)
      points.push(Math.cos(a) * dist, Math.sin(a) * dist)
    }

    return new Graphics()
      .poly(points)
      .stroke({ color: 0xaaaaaa, width: 2 })
  }

  update(delta: number) {
    this.x += this.vx * delta
    this.y += this.vy * delta
    this.view.x = this.x
    this.view.y = this.y
    this.view.rotation += 0.005 * delta
  }

  split(): Asteroid[] {
    if (this.size === 'small') return []
    const next: AsteroidSize = this.size === 'large' ? 'medium' : 'small'
    const baseAngle = Math.random() * Math.PI * 2
    return [
      new Asteroid(next, this.x, this.y, baseAngle),
      new Asteroid(next, this.x, this.y, baseAngle + Math.PI),
    ]
  }
}
