import { Container, Graphics } from 'pixi.js'

const ROT_SPEED  = 0.065
const THRUST     = 0.25
const MAX_SPEED  = 8
const DRAG       = 0.985

export class Ship {
  view       = new Container()
  x          = 0
  y          = 0
  vx         = 0
  vy         = 0
  radius     = 14
  invincible = false

  private hull:  Graphics
  private flame: Graphics

  constructor() {
    this.hull = new Graphics()
      .moveTo(0, -20)
      .lineTo(13, 14)
      .lineTo(0, 8)
      .lineTo(-13, 14)
      .lineTo(0, -20)
      .stroke({ color: 0xffffff, width: 2 })

    this.flame = new Graphics()
      .moveTo(-6, 10)
      .lineTo(0, 26)
      .lineTo(6, 10)
      .stroke({ color: 0xff6600, width: 2 })

    this.flame.visible = false
    this.view.addChild(this.hull, this.flame)
  }

  update(delta: number, keys: Set<string>) {
    if (keys.has('ArrowLeft'))  this.view.rotation -= ROT_SPEED * delta
    if (keys.has('ArrowRight')) this.view.rotation += ROT_SPEED * delta

    const thrusting = keys.has('ArrowUp')
    this.flame.visible = thrusting && Math.random() > 0.3

    if (thrusting) {
      this.vx += Math.sin(this.view.rotation) * THRUST * delta
      this.vy -= Math.cos(this.view.rotation) * THRUST * delta
    }

    const speed = Math.hypot(this.vx, this.vy)
    if (speed > MAX_SPEED) {
      this.vx = (this.vx / speed) * MAX_SPEED
      this.vy = (this.vy / speed) * MAX_SPEED
    }

    this.vx *= DRAG
    this.vy *= DRAG
    this.x  += this.vx * delta
    this.y  += this.vy * delta

    this.view.x = this.x
    this.view.y = this.y

    // blink when invincible
    if (this.invincible) this.view.alpha = Math.sin(Date.now() / 80) > 0 ? 1 : 0.2
    else this.view.alpha = 1
  }

  reset(x: number, y: number) {
    this.x = x; this.y = y
    this.vx = 0; this.vy = 0
    this.view.rotation = 0
    this.invincible = true
    setTimeout(() => { this.invincible = false }, 2500)
  }
}