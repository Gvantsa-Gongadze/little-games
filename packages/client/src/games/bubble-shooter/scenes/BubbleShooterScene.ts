import { Application, Container, Graphics } from 'pixi.js'
import type { Scene } from '@/engine/SceneManager'
import { GridManager } from '../managers/GridManager'
import { Launcher }    from '../entities/Launcher'
import { Bubble }      from '../entities/Bubble'
import {
  BUBBLE_RADIUS, COL_SPACING, COLS, GRID_TOP_PAD,
  BUBBLE_SPEED, LAUNCHER_Y_OFFSET, BARREL_LENGTH, MIN_AIM_ANGLE,
  type BubbleColor,
} from '../constants'
import { LEVEL_1 } from '../data/levels'

const ALL_COLORS: BubbleColor[] = ['red', 'blue', 'green', 'yellow', 'purple', 'orange']
const randomColor = (): BubbleColor => ALL_COLORS[Math.floor(Math.random() * ALL_COLORS.length)]

type InFlight = { bubble: Bubble; vx: number; vy: number }

export class BubbleShooterScene implements Scene {
  view = new Container()

  // rendering layers (back → front)
  private gridLayer     = new Container()
  private flightLayer   = new Container()
  private launcherLayer = new Container()

  private grid:     GridManager
  private launcher: Launcher
  private aimGuide  = new Graphics()

  private inFlight:      InFlight | null = null
  private currentBubble: Bubble
  private currentColor:  BubbleColor

  private launcherX: number
  private launcherY: number
  private screenW:   number
  private aimAngle = -Math.PI / 2   // straight up

  private boundMouseMove: (e: MouseEvent) => void
  private boundClick:     (e: MouseEvent) => void

  constructor(app: Application) {
    const W = app.screen.width
    const H = app.screen.height
    this.screenW   = W
    this.launcherX = W / 2
    this.launcherY = H - LAUNCHER_Y_OFFSET

    // Grid
    const gridPixelWidth = COLS * COL_SPACING
    const startX = (W - gridPixelWidth) / 2 + BUBBLE_RADIUS
    this.grid = new GridManager(startX, GRID_TOP_PAD)
    this.grid.populate(LEVEL_1)
    this.gridLayer.addChild(this.grid.container)

    // Launcher + preview bubble
    this.launcher = new Launcher(this.launcherX, this.launcherY)
    this.currentColor  = randomColor()
    this.currentBubble = new Bubble(this.currentColor)
    this.currentBubble.view.x = this.launcherX
    this.currentBubble.view.y = this.launcherY

    // Bottom platform bar
    const bar = new Graphics()
    bar.rect(0, H - 36, W, 36).fill({ color: 0x0d1a22 })
    bar.moveTo(0, H - 36).lineTo(W, H - 36).stroke({ color: 0x3388aa, alpha: 0.35, width: 1 })

    // Launcher layer: aim guide behind launcher, preview bubble in front
    this.launcherLayer.addChild(this.aimGuide, this.launcher.view, this.currentBubble.view)

    this.view.addChild(this.gridLayer, this.flightLayer, bar, this.launcherLayer)

    // Pointer events
    this.boundMouseMove = (e) => this.handleAim(e.clientX, e.clientY)
    this.boundClick     = (e) => this.handleFire(e.clientX, e.clientY)
    window.addEventListener('mousemove', this.boundMouseMove)
    window.addEventListener('click',     this.boundClick)

    this.drawAimGuide()
  }

  private toAimAngle(mx: number, my: number): number {
    const angle = Math.atan2(my - this.launcherY, mx - this.launcherX)
    // clamp so the shot always goes upward with a minimum of MIN_AIM_ANGLE from horizontal
    return Math.max(-Math.PI + MIN_AIM_ANGLE, Math.min(-MIN_AIM_ANGLE, angle))
  }

  private handleAim(mx: number, my: number) {
    if (my >= this.launcherY) return
    this.aimAngle = this.toAimAngle(mx, my)
    this.launcher.setAngle(this.aimAngle)
    this.drawAimGuide()
  }

  private handleFire(mx: number, my: number) {
    if (this.inFlight) return    // one bubble in the air at a time
    if (my >= this.launcherY) return

    const angle = this.toAimAngle(mx, my)

    // Hand the current bubble off to flightLayer
    this.launcherLayer.removeChild(this.currentBubble.view)
    this.currentBubble.view.x = this.launcherX
    this.currentBubble.view.y = this.launcherY
    this.flightLayer.addChild(this.currentBubble.view)

    this.inFlight = {
      bubble: this.currentBubble,
      vx: Math.cos(angle) * BUBBLE_SPEED,
      vy: Math.sin(angle) * BUBBLE_SPEED,
    }

    // Queue next bubble at launcher
    this.currentColor  = randomColor()
    this.currentBubble = new Bubble(this.currentColor)
    this.currentBubble.view.x = this.launcherX
    this.currentBubble.view.y = this.launcherY
    this.launcherLayer.addChild(this.currentBubble.view)
  }

  private drawAimGuide() {
    this.aimGuide.clear()

    // Start dots from just past the barrel tip
    const START = BARREL_LENGTH + BUBBLE_RADIUS
    let x  = this.launcherX + Math.cos(this.aimAngle) * START
    let y  = this.launcherY + Math.sin(this.aimAngle) * START
    let vx = Math.cos(this.aimAngle)
    const vy = Math.sin(this.aimAngle)

    const DOT_STEP  = 16
    const MAX_STEPS = 38

    for (let i = 0; i < MAX_STEPS; i++) {
      x += vx * DOT_STEP
      y += vy * DOT_STEP

      // mirror wall bounces in the guide
      if (x - BUBBLE_RADIUS <= 0) {
        x  = BUBBLE_RADIUS + (BUBBLE_RADIUS - (x - BUBBLE_RADIUS))
        vx = -vx
      } else if (x + BUBBLE_RADIUS >= this.screenW) {
        x  = this.screenW - BUBBLE_RADIUS
        vx = -vx
      }

      if (y <= GRID_TOP_PAD) break

      const alpha = Math.max(0.04, 0.48 - i * 0.012)
      this.aimGuide.circle(x, y, 2.5).fill({ color: 0xffffff, alpha })
    }
  }

  update(delta: number) {
    if (!this.inFlight) return

    const f = this.inFlight
    f.bubble.view.x += f.vx * delta
    f.bubble.view.y += f.vy * delta

    // Left wall
    if (f.bubble.view.x - BUBBLE_RADIUS <= 0) {
      f.bubble.view.x = BUBBLE_RADIUS
      f.vx = Math.abs(f.vx)
    }
    // Right wall
    else if (f.bubble.view.x + BUBBLE_RADIUS >= this.screenW) {
      f.bubble.view.x = this.screenW - BUBBLE_RADIUS
      f.vx = -Math.abs(f.vx)
    }

    // Reached the grid area — placeholder until step 3 (snap + match)
    if (f.bubble.view.y - BUBBLE_RADIUS <= GRID_TOP_PAD) {
      this.flightLayer.removeChild(f.bubble.view)
      f.bubble.view.destroy()
      this.inFlight = null
    }
  }

  destroy() {
    window.removeEventListener('mousemove', this.boundMouseMove)
    window.removeEventListener('click',     this.boundClick)
    this.view.destroy({ children: true })
  }
}
