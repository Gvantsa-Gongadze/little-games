import { Container, Graphics } from 'pixi.js'

export type UFOSize = 'large' | 'small'

const SPEED:  Record<UFOSize, number> = { large: 1.8, small: 2.6 }
const RADIUS: Record<UFOSize, number> = { large: 22,  small: 13  }
const COLOR:  Record<UFOSize, number> = { large: 0xff4422, small: 0xff2288 }

// Points awarded when destroyed
export const UFO_SCORE: Record<UFOSize, number> = { large: 200, small: 1000 }

// Frames between shots
const FIRE_RATE: Record<UFOSize, number> = { large: 130, small: 85 }

export class UFO {
  view       = new Container()
  x:         number
  y:         number
  vx:        number
  radius:    number
  size:      UFOSize
  alive      = true
  fireTimer: number

  private weaveClock = 0

  constructor(size: UFOSize) {
    this.size      = size
    this.radius    = RADIUS[size]
    this.fireTimer = FIRE_RATE[size]

    // enter from a random side
    const fromLeft = Math.random() < 0.5
    this.x  = fromLeft ? -this.radius - 10 : window.innerWidth + this.radius + 10
    this.y  = 80 + Math.random() * (window.innerHeight - 160)
    this.vx = fromLeft ? SPEED[size] : -SPEED[size]

    this.view.addChild(this.buildShape())
  }

  private buildShape(): Graphics {
    const r     = this.radius
    const color = COLOR[this.size]
    const g     = new Graphics()

    // main disc
    g.ellipse(0, 0, r, r * 0.38).stroke({ color, width: 2 })
    // top dome
    g.ellipse(0, -r * 0.32, r * 0.55, r * 0.42).stroke({ color, width: 2 })
    // three equator lights
    for (let i = -1; i <= 1; i++) {
      g.circle(i * r * 0.38, 0, r * 0.1).fill(color)
    }
    return g
  }

  update(delta: number) {
    this.weaveClock += delta * 0.028
    this.x += this.vx * delta
    this.y += Math.sin(this.weaveClock) * 1.6 * delta

    this.view.x = this.x
    this.view.y = this.y

    this.fireTimer -= delta

    // disappears once fully off-screen
    if (this.x < -80 || this.x > window.innerWidth + 80) this.alive = false
  }

  aimAngle(targetX: number, targetY: number): number {
    if (this.size === 'large') return Math.random() * Math.PI * 2
    return Math.atan2(targetY - this.y, targetX - this.x)
  }

  resetFireTimer() {
    this.fireTimer = FIRE_RATE[this.size] * (0.8 + Math.random() * 0.4)
  }
}
