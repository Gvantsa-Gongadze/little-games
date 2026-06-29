import { Graphics } from 'pixi.js'
import { BALL_RADIUS, ACCENT } from '../constants'

export class Ball {
  view:        Graphics
  x:           number
  y:           number
  vx:          number
  vy:          number
  active:      boolean   // false once ball lands at the bottom
  hitCooldown: number    // frames remaining until this ball can hit again

  constructor(x: number, y: number, vx: number, vy: number) {
    this.x           = x
    this.y           = y
    this.vx          = vx
    this.vy          = vy
    this.active      = true
    this.hitCooldown = 0

    const r   = BALL_RADIUS
    this.view = new Graphics()
    this.view.circle(0, 0, r + 4).fill({ color: ACCENT, alpha: 0.18 })   // glow
    this.view.circle(0, 0, r).fill({ color: ACCENT })                      // body
    this.view.circle(0, 0, r * 0.52).fill({ color: 0xff9944 })            // hot core
    this.view.circle(-r * 0.28, -r * 0.32, r * 0.36)                     // specular
          .fill({ color: 0xffeecc, alpha: 0.72 })
    this.view.position.set(x, y)
  }

  setPos(x: number, y: number) {
    this.x = x
    this.y = y
    this.view.position.set(x, y)
  }
}
