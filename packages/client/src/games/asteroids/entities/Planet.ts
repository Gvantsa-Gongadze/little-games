import { Container, Graphics } from 'pixi.js'

const PALETTES = [
  { body: 0x1a4a8a, accent: 0x3388dd },  // ice blue
  { body: 0x8a2a1a, accent: 0xcc4433 },  // mars red
  { body: 0x1a6a3a, accent: 0x44aa55 },  // emerald
  { body: 0x7a5a22, accent: 0xbbaa44 },  // gas giant
  { body: 0x5a1a7a, accent: 0x9944cc },  // nebula purple
]

export class Planet {
  view:   Container
  x:      number
  y:      number
  vx:     number
  vy:     number
  radius: number
  private readonly hasRings: boolean

  constructor(x: number, y: number, radius: number) {
    this.x        = x
    this.y        = y
    this.radius   = radius
    this.hasRings = radius >= 38 && Math.random() < 0.6
    const angle   = Math.random() * Math.PI * 2
    const speed   = 0.2 + Math.random() * 0.35
    this.vx       = Math.cos(angle) * speed
    this.vy       = Math.sin(angle) * speed
    this.view     = new Container()
    this.view.x   = x
    this.view.y   = y
    this.build()
  }

  update(delta: number) {
    this.x      += this.vx * delta
    this.y      += this.vy * delta
    this.view.x  = this.x
    this.view.y  = this.y
  }

  private build() {
    const g   = new Graphics()
    const r   = this.radius
    const pal = PALETTES[Math.floor(Math.random() * PALETTES.length)]

    // faint gravity haze hinting at pull zone
    g.circle(0, 0, r * 4).fill({ color: pal.accent, alpha: 0.025 })

    // atmospheric glow
    g.circle(0, 0, r + 5).fill({ color: pal.accent, alpha: 0.15 })

    // rings drawn before body so body naturally covers the centre intersection
    if (this.hasRings) {
      g.ellipse(0, 0, r * 1.9,  r * 0.38).stroke({ color: pal.accent, width: 4,   alpha: 0.55 })
      g.ellipse(0, 0, r * 1.55, r * 0.28).stroke({ color: pal.body,   width: 2.5, alpha: 0.35 })
    }

    // main body
    g.circle(0, 0, r).fill({ color: pal.body })

    // terminator — offset dark circle creates a lit-from-upper-left 3-D illusion
    g.circle(r * 0.28, r * 0.08, r * 0.88).fill({ color: 0x000000, alpha: 0.42 })

    // subtle equatorial band
    g.ellipse(0, 0, r * 0.85, r * 0.09).fill({ color: 0x000000, alpha: 0.12 })

    // specular highlight
    g.circle(-r * 0.3, -r * 0.32, r * 0.36).fill({ color: 0xffffff, alpha: 0.07 })

    this.view.addChild(g)
  }
}
