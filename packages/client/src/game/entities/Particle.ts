import { Graphics } from 'pixi.js'
import type { AsteroidSize } from './Asteroid'

const LIFE:   Record<AsteroidSize, number> = { large: 50, medium: 38, small: 26 }
const SPEED:  Record<AsteroidSize, number> = { large: 3.5, medium: 2.8, small: 2.2 }
const LENGTH: Record<AsteroidSize, number> = { large: 11, medium: 7, small: 4 }

export class Particle {
  view:    Graphics
  x:       number
  y:       number
  vx:      number
  vy:      number
  life:    number
  private maxLife:  number
  private rotSpeed: number

  constructor(x: number, y: number, vx: number, vy: number, length: number, life: number) {
    this.x        = x
    this.y        = y
    this.vx       = vx
    this.vy       = vy
    this.life     = life
    this.maxLife  = life
    this.rotSpeed = (Math.random() - 0.5) * 0.25

    this.view = new Graphics()
      .moveTo(-length / 2, 0)
      .lineTo(length / 2, 0)
      .stroke({ color: 0x33ff66, width: 1.5 })
  }

  update(delta: number) {
    this.life    -= delta
    this.x       += this.vx * delta
    this.y       += this.vy * delta
    this.view.rotation += this.rotSpeed * delta
    this.view.x  = this.x
    this.view.y  = this.y
    this.view.alpha = Math.max(0, this.life / this.maxLife)
  }

  get dead() { return this.life <= 0 }
}

export function explode(
  x: number, y: number,
  parentVx: number, parentVy: number,
  size: AsteroidSize,
): Particle[] {
  const count  = 8 + Math.floor(Math.random() * 5)   // 8–12
  const speed  = SPEED[size]
  const life   = LIFE[size]
  const length = LENGTH[size]
  const out: Particle[] = []

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const s     = speed * (0.4 + Math.random() * 0.9)
    // inherit a fraction of the asteroid's momentum so debris drifts naturally
    const vx = parentVx * 0.25 + Math.cos(angle) * s
    const vy = parentVy * 0.25 + Math.sin(angle) * s
    out.push(new Particle(x, y, vx, vy, length, life + Math.random() * 12))
  }
  return out
}
