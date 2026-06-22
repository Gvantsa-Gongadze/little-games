import { Graphics } from 'pixi.js'

const SPEED    = 12
const LIFETIME = 55 // frames

export class Bullet {
  view:  Graphics
  x:     number
  y:     number
  vx:    number
  vy:    number
  radius = 3
  life   = LIFETIME

  constructor(x: number, y: number, angle: number) {
    this.x  = x
    this.y  = y
    this.vx = Math.sin(angle) * SPEED
    this.vy = -Math.cos(angle) * SPEED

    this.view = new Graphics()
      .circle(0, 0, this.radius)
      .fill(0xffff66)
  }

  update(delta: number) {
    this.life -= delta
    this.x   += this.vx * delta
    this.y   += this.vy * delta
    this.view.x = this.x
    this.view.y = this.y
  }

  get dead() { return this.life <= 0 }
}
