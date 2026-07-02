import { Graphics } from 'pixi.js'
import { BALL_RADIUS } from '../constants'

export class Ball {
  view = new Graphics()
  x:  number
  y:  number
  vx: number
  vy: number
  active      = true
  hitCooldown = 0

  constructor(x: number, y: number, vx: number, vy: number) {
    this.x  = x
    this.y  = y
    this.vx = vx
    this.vy = vy

    const r = BALL_RADIUS
    this.view.label = 'ball'
    this.view.circle(0, 0, r + 3).fill({ color: 0xff6600, alpha: 0.18 })       // outer glow
    this.view.circle(0, 0, r).fill({ color: 0xff8800 })                        // body
    this.view.circle(0, 0, r * 0.45).fill({ color: 0xffcc44 })                 // hot core
    this.view.circle(-r * 0.3, -r * 0.3, r * 0.25)
      .fill({ color: 0xffffff, alpha: 0.7 })                                   // specular

    this.setPos(x, y)
  }

  setPos(x: number, y: number) {
    this.x = x
    this.y = y
    this.view.position.set(x, y)
  }
}
