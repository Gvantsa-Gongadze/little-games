import { Application, Container, Graphics } from 'pixi.js'
import { gsap } from 'gsap'
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
  private dropLayer     = new Container()   // falling bubbles after disconnect
  private launcherLayer = new Container()

  private grid:     GridManager
  private launcher: Launcher
  private aimGuide  = new Graphics()

  private inFlight:      InFlight | null = null
  private currentBubble: Bubble
  private currentColor:  BubbleColor

  private launcherX: number
  private launcherY: number
  private wallLeft:  number   // left bounce wall  = left edge of grid
  private wallRight: number   // right bounce wall = right edge of grid
  private aimAngle  = -Math.PI / 2   // straight up
  private aimDirty  = true           // redraw guide once per frame, not per mousemove

  private boundMouseMove: (e: MouseEvent) => void
  private boundClick:     (e: MouseEvent) => void

  constructor(app: Application) {
    const W = app.screen.width
    const H = app.screen.height
    this.launcherX = W / 2
    this.launcherY = H - LAUNCHER_Y_OFFSET

    // Grid — centred horizontally
    const gridPixelWidth = COLS * COL_SPACING   // 440 px for 11 cols
    const startX = (W - gridPixelWidth) / 2 + BUBBLE_RADIUS
    this.grid = new GridManager(startX, GRID_TOP_PAD)

    // Bounce walls = grid edges, not screen edges.
    // Bubbles must stay inside the playfield so they always land on the grid.
    this.wallLeft  = startX - BUBBLE_RADIUS          // left face of col-0 bubble
    this.wallRight = startX - BUBBLE_RADIUS + gridPixelWidth  // right face of col-10 bubble
    this.grid.populate(LEVEL_1)
    this.gridLayer.addChild(this.grid.container)

    // Launcher + preview bubble
    this.launcher = new Launcher(this.launcherX, this.launcherY)
    this.currentColor  = randomColor()
    this.currentBubble = new Bubble(this.currentColor)
    this.currentBubble.view.x = this.launcherX
    this.currentBubble.view.y = this.launcherY

    // Playfield wall lines (visual guides matching bounce walls)
    const walls = new Graphics()
    walls.moveTo(this.wallLeft,  GRID_TOP_PAD).lineTo(this.wallLeft,  H - 36).stroke({ color: 0x3388aa, alpha: 0.25, width: 1 })
    walls.moveTo(this.wallRight, GRID_TOP_PAD).lineTo(this.wallRight, H - 36).stroke({ color: 0x3388aa, alpha: 0.25, width: 1 })

    // Bottom platform bar
    const bar = new Graphics()
    bar.rect(0, H - 36, W, 36).fill({ color: 0x0d1a22 })
    bar.moveTo(0, H - 36).lineTo(W, H - 36).stroke({ color: 0x3388aa, alpha: 0.35, width: 1 })

    // Launcher layer: aim guide behind launcher, preview bubble in front
    this.launcherLayer.addChild(this.aimGuide, this.launcher.view, this.currentBubble.view)

    this.view.addChild(this.gridLayer, this.flightLayer, this.dropLayer, walls, bar, this.launcherLayer)

    // Pointer events
    this.boundMouseMove = (e) => this.handleAim(e.clientX, e.clientY)
    this.boundClick     = (e) => this.handleFire(e.clientX, e.clientY)
    window.addEventListener('mousemove', this.boundMouseMove)
    window.addEventListener('click',     this.boundClick)

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
    this.aimDirty = true   // guide redraws in update(), not here
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
      if (x - BUBBLE_RADIUS <= this.wallLeft) {
        x  = this.wallLeft + BUBBLE_RADIUS
        vx = -vx
      } else if (x + BUBBLE_RADIUS >= this.wallRight) {
        x  = this.wallRight - BUBBLE_RADIUS
        vx = -vx
      }

      if (y <= GRID_TOP_PAD) break

      const alpha = Math.max(0.04, 0.48 - i * 0.012)
      this.aimGuide.circle(x, y, 2.5).fill({ color: 0xffffff, alpha })
    }
  }

  update(delta: number) {
    // Redraw aim guide at most once per frame regardless of mousemove rate
    if (this.aimDirty) {
      this.drawAimGuide()
      this.aimDirty = false
    }

    if (!this.inFlight) return

    const f = this.inFlight
    f.bubble.view.x += f.vx * delta
    f.bubble.view.y += f.vy * delta

    // Left playfield wall
    if (f.bubble.view.x - BUBBLE_RADIUS <= this.wallLeft) {
      f.bubble.view.x = this.wallLeft + BUBBLE_RADIUS
      f.vx = Math.abs(f.vx)
    }
    // Right playfield wall
    else if (f.bubble.view.x + BUBBLE_RADIUS >= this.wallRight) {
      f.bubble.view.x = this.wallRight - BUBBLE_RADIUS
      f.vx = -Math.abs(f.vx)
    }

    // Reached the hard top boundary
    let shouldLand = f.bubble.view.y - BUBBLE_RADIUS <= GRID_TOP_PAD

    // Check proximity to any occupied grid cell
    if (!shouldLand) {
      const approx  = this.grid.pixelToCell(f.bubble.view.x, f.bubble.view.y)
      const toCheck = [approx, ...this.grid.getHexNeighbors(approx.col, approx.row)]
      for (const n of toCheck) {
        const cell = this.grid.getCell(n.col, n.row)
        if (!cell?.bubble) continue
        const { x, y } = this.grid.cellToPixel(n.col, n.row)
        if (Math.hypot(f.bubble.view.x - x, f.bubble.view.y - y) < BUBBLE_RADIUS * 2) {
          shouldLand = true
          break
        }
      }
    }

    if (shouldLand) {
      this.inFlight = null
      this.landBubble(f.bubble, f.bubble.view.x, f.bubble.view.y)
    }
  }

  private landBubble(bubble: Bubble, px: number, py: number) {
    this.flightLayer.removeChild(bubble.view)

    const snapCell = this.grid.findSnapCell(px, py)
    if (!snapCell) {
      // No valid empty cell found — discard the bubble
      bubble.view.destroy()
      return
    }

    // Snap bubble into the grid
    this.grid.place(snapCell.col, snapCell.row, bubble)

    // BFS colour-match: pop cluster of 3+
    const cluster = this.grid.findCluster(snapCell.col, snapCell.row)
    if (cluster.length >= 3) {
      for (const c of cluster) this.grid.removeBubble(c.col, c.row)

      // Animate any bubbles now disconnected from the top
      const floating = this.grid.findFloating()
      this.animateDrop(floating)
    }
  }

  private animateDrop(cells: { col: number; row: number }[]) {
    for (const c of cells) {
      const bubble = this.grid.extractBubble(c.col, c.row)
      if (!bubble) continue

      this.dropLayer.addChild(bubble.view)

      // Stagger slightly so a cascade looks like separate bubbles falling
      const delay    = Math.random() * 0.08
      const drift    = (Math.random() - 0.5) * 40   // gentle horizontal drift
      const duration = 0.55 + Math.random() * 0.15

      gsap.to(bubble.view, {
        x:        bubble.view.x + drift,
        y:        bubble.view.y + 520,
        alpha:    0,
        duration,
        delay,
        ease:     'power2.in',
        onComplete: () => {
          this.dropLayer.removeChild(bubble.view)
          bubble.view.destroy()
        },
      })
    }
  }

  destroy() {
    window.removeEventListener('mousemove', this.boundMouseMove)
    window.removeEventListener('click',     this.boundClick)
    this.view.destroy({ children: true })
  }
}
