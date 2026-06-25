import { Application, Container, Graphics, Text } from 'pixi.js'
import { gsap } from 'gsap'
import T from '@/data/strings.json'
import type { Scene } from '@/engine/SceneManager'
import { GridManager } from '../managers/GridManager'
import { Launcher }    from '../entities/Launcher'
import { Bubble }      from '../entities/Bubble'
import {
  BUBBLE_RADIUS, COL_SPACING, COLS, GRID_TOP_PAD, HUD_FONT, ROW_SPACING,
  BUBBLE_SPEED, LAUNCHER_Y_OFFSET, BARREL_LENGTH, MIN_AIM_ANGLE,
  SPECIAL_SPAWN_RATE, ADVANCE_EVERY,
  type BubbleColor, type SpecialType,
} from '../constants'
import { LEVEL_1 } from '../data/levels'

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
  private nextBubble:    Bubble
  private score          = 0
  private scoreText:     Text

  private gameState:   'playing' | 'won' | 'lost' = 'playing'
  private onGameOver?: (score: number, state: 'won' | 'lost') => void
  private dangerY:     number

  private launcherX: number
  private launcherY: number
  private wallLeft:  number   // left bounce wall  = left edge of grid
  private wallRight: number   // right bounce wall = right edge of grid
  private aimAngle  = -Math.PI / 2   // straight up
  private aimDirty  = true           // redraw guide once per frame, not per mousemove

  private advanceBar         = new Graphics()
  private shotsUntilAdvance  = ADVANCE_EVERY

  private boundMouseMove: (e: MouseEvent) => void
  private boundClick:     (e: MouseEvent) => void
  private boundKeyDown:   (e: KeyboardEvent) => void

  constructor(app: Application, onGameOver?: (score: number, state: 'won' | 'lost') => void) {
    this.onGameOver = onGameOver
    const W = app.screen.width
    const H = app.screen.height
    this.launcherX = W / 2
    this.launcherY = H - LAUNCHER_Y_OFFSET
    this.dangerY   = this.launcherY - BUBBLE_RADIUS * 4

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

    // Launcher + current and next bubbles
    this.launcher = new Launcher(this.launcherX, this.launcherY)
    this.currentBubble = this.spawnBubble()
    this.currentBubble.view.x = this.launcherX
    this.currentBubble.view.y = this.launcherY
    this.nextBubble = this.spawnBubble()
    this.nextBubble.view.x = this.launcherX + 65
    this.nextBubble.view.y = this.launcherY

    // Playfield wall lines + danger line (visual guides)
    const walls = new Graphics()
    walls.moveTo(this.wallLeft,  GRID_TOP_PAD).lineTo(this.wallLeft,  H - 36).stroke({ color: 0x3388aa, alpha: 0.25, width: 1 })
    walls.moveTo(this.wallRight, GRID_TOP_PAD).lineTo(this.wallRight, H - 36).stroke({ color: 0x3388aa, alpha: 0.25, width: 1 })
    walls.moveTo(this.wallLeft,  this.dangerY).lineTo(this.wallRight, this.dangerY).stroke({ color: 0xff4444, alpha: 0.45, width: 1.5 })

    // Bottom platform bar
    const bar = new Graphics()
    bar.rect(0, H - 36, W, 36).fill({ color: 0x0d1a22 })
    bar.moveTo(0, H - 36).lineTo(W, H - 36).stroke({ color: 0x3388aa, alpha: 0.35, width: 1 })

    // "NEXT" label above the preview slot
    const nextLabel = new Text({
      text: T.bubble.next,
      style: { fill: 0x888888, fontSize: 8, fontFamily: HUD_FONT },
    })
    nextLabel.anchor.set(0.5)
    nextLabel.x = this.launcherX + 65
    nextLabel.y = this.launcherY - BUBBLE_RADIUS - 14

    // Launcher layer: aim guide behind launcher, then bubbles and label in front
    this.launcherLayer.addChild(
      this.aimGuide, this.launcher.view, this.currentBubble.view,
      nextLabel, this.nextBubble.view,
    )

    // HUD — score panel on the right side of the top bar
    const hudLayer = new Container()

    const panelBg = new Graphics()
    panelBg.rect(W - 190, 0, 190, GRID_TOP_PAD).fill({ color: 0x060d13, alpha: 0.8 })
    panelBg.moveTo(W - 190, 0).lineTo(W - 190, GRID_TOP_PAD).stroke({ color: 0x3388aa, alpha: 0.3, width: 1 })
    panelBg.moveTo(W - 190, GRID_TOP_PAD).lineTo(W, GRID_TOP_PAD).stroke({ color: 0x3388aa, alpha: 0.3, width: 1 })

    const scoreLbl = new Text({
      text: T.bubble.score,
      style: { fill: 0x6699aa, fontSize: 9, fontFamily: HUD_FONT },
    })
    scoreLbl.anchor.set(1, 0)
    scoreLbl.x = W - 14
    scoreLbl.y = 5

    this.scoreText = new Text({
      text: T.bubble.scoreDefault,
      style: { fill: 0xff6eb4, fontSize: 15, fontFamily: HUD_FONT },
    })
    this.scoreText.anchor.set(1, 0)
    this.scoreText.x = W - 14
    this.scoreText.y = 19

    hudLayer.addChild(panelBg, scoreLbl, this.scoreText)

    this.updateAdvanceBar()

    this.view.addChild(
      this.gridLayer, this.flightLayer, this.dropLayer,
      walls, bar, this.launcherLayer, this.advanceBar, hudLayer,
    )

    // Pointer + keyboard events
    this.boundMouseMove = (e) => this.handleAim(e.clientX, e.clientY)
    this.boundClick     = (e) => this.handleFire(e.clientX, e.clientY)
    this.boundKeyDown   = (e) => { if (e.code === 'KeyR' && this.gameState !== 'playing') window.location.reload() }
    window.addEventListener('mousemove', this.boundMouseMove)
    window.addEventListener('click',     this.boundClick)
    window.addEventListener('keydown',   this.boundKeyDown)

  }

  private addScore(points: number) {
    this.score += points
    this.scoreText.text = String(this.score)
    gsap.fromTo(this.scoreText.scale,
      { x: 1.35, y: 1.35 },
      { x: 1, y: 1, duration: 0.22, ease: 'back.out(2)' },
    )
  }

  private sampleColor(): BubbleColor {
    const colors = this.grid.getBoardColors()
    return colors[Math.floor(Math.random() * colors.length)]
  }

  private toAimAngle(mx: number, my: number): number {
    const angle = Math.atan2(my - this.launcherY, mx - this.launcherX)
    // clamp so the shot always goes upward with a minimum of MIN_AIM_ANGLE from horizontal
    return Math.max(-Math.PI + MIN_AIM_ANGLE, Math.min(-MIN_AIM_ANGLE, angle))
  }

  private handleAim(mx: number, my: number) {
    if (this.gameState !== 'playing') return
    if (my >= this.launcherY) return
    this.aimAngle = this.toAimAngle(mx, my)
    this.launcher.setAngle(this.aimAngle)
    this.aimDirty = true   // guide redraws in update(), not here
  }

  private handleFire(mx: number, my: number) {
    if (this.gameState !== 'playing') return
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

    // Advance queue: next → current, sample a new next
    this.currentBubble = this.nextBubble
    this.currentBubble.view.x = this.launcherX
    this.currentBubble.view.y = this.launcherY
    this.nextBubble = this.spawnBubble()
    this.nextBubble.view.x = this.launcherX + 65
    this.nextBubble.view.y = this.launcherY
    this.launcherLayer.addChild(this.nextBubble.view)

    // Shot counter — trigger a board-pressure advance every ADVANCE_EVERY shots
    this.shotsUntilAdvance--
    if (this.shotsUntilAdvance <= 0) {
      this.shotsUntilAdvance = ADVANCE_EVERY
      this.advanceBoard()
    }
    this.updateAdvanceBar()
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

  private updateAdvanceBar() {
    this.advanceBar.clear()

    const totalW   = this.wallRight - this.wallLeft
    const progress = 1 - this.shotsUntilAdvance / ADVANCE_EVERY
    const h        = 6
    // Keep the bar above the topmost bubble edge (GRID_TOP_PAD - BUBBLE_RADIUS) with a 2 px gap
    const y        = GRID_TOP_PAD - BUBBLE_RADIUS - h - 2

    // Dark background track so the bar is visible even when empty
    this.advanceBar.rect(this.wallLeft, y, totalW, h).fill({ color: 0x060d13, alpha: 0.9 })

    // Colour-coded fill: blue → orange → red as pressure grows
    if (progress > 0) {
      const color = progress > 0.75 ? 0xff3333 : progress > 0.5 ? 0xff9933 : 0x33aaff
      this.advanceBar.rect(this.wallLeft, y, totalW * progress, h).fill({ color, alpha: 0.9 })
    }

    // Segment dividers — one tick per shot so the player can count down
    for (let i = 1; i < ADVANCE_EVERY; i++) {
      const x = this.wallLeft + (totalW / ADVANCE_EVERY) * i
      this.advanceBar.moveTo(x, y).lineTo(x, y + h).stroke({ color: 0x000000, alpha: 0.45, width: 1 })
    }

    // Top border line for definition
    this.advanceBar.moveTo(this.wallLeft, y).lineTo(this.wallRight, y).stroke({ color: 0x3388aa, alpha: 0.35, width: 1 })
  }

  private advanceBoard() {
    if (this.gameState !== 'playing') return
    // Offset the grid container upward so that after repositioning all bubbles
    // to their new (shifted-down) positions the grid is visually unchanged.
    // Animating container.y back to 0 creates the slide-in effect.
    gsap.killTweensOf(this.grid.container)
    this.grid.container.y = -ROW_SPACING
    this.grid.addTopRow(() => this.sampleColor())
    gsap.to(this.grid.container, {
      y: 0,
      duration: 0.45,
      ease: 'power2.inOut',
      onComplete: () => {
        if (this.grid.hasBubbleBelowY(this.dangerY)) this.showResult('lost')
      },
    })
  }

  private spawnBubble(): Bubble {
    if (Math.random() < SPECIAL_SPAWN_RATE) {
      const types: SpecialType[] = ['bomb', 'rainbow', 'colorBomb', 'stone', 'frozen', 'lightning']
      const type = types[Math.floor(Math.random() * types.length)]
      return new Bubble(this.sampleColor(), type)
    }
    return new Bubble(this.sampleColor())
  }

  private landBubble(bubble: Bubble, px: number, py: number) {
    this.flightLayer.removeChild(bubble.view)

    const snapCell = this.grid.findSnapCell(px, py)
    if (!snapCell) { bubble.view.destroy(); return }

    this.grid.place(snapCell.col, snapCell.row, bubble)

    // Special bubbles with area effects bypass normal cluster matching
    switch (bubble.special) {
      case 'bomb':      return this.handleBombEffect(snapCell.col, snapCell.row)
      case 'lightning': return this.handleLightningEffect(snapCell.col, snapCell.row)
      case 'colorBomb': return this.handleColorBombEffect(snapCell.col, snapCell.row)
    }

    // Normal / rainbow / frozen / stone flow
    const cluster = this.grid.findCluster(snapCell.col, snapCell.row)
    if (cluster.length >= 3) {
      // Pre-existing frozen bubbles in cluster get a first-hit unfreeze instead of a pop.
      // The fired bubble itself (snapCell) is always popped directly.
      const isFiredCell = (c: { col: number; row: number }) =>
        c.col === snapCell.col && c.row === snapCell.row

      const toUnfreeze = cluster.filter(c =>
        !isFiredCell(c) && this.grid.getCell(c.col, c.row)?.bubble?.special === 'frozen',
      )
      const toPop = cluster.filter(c =>
        isFiredCell(c) || this.grid.getCell(c.col, c.row)?.bubble?.special !== 'frozen',
      )

      // Swap frozen bubbles for normal ones (first hit)
      for (const c of toUnfreeze) {
        const b = this.grid.getCell(c.col, c.row)?.bubble
        if (!b) continue
        this.grid.removeBubble(c.col, c.row)
        this.grid.place(c.col, c.row, new Bubble(b.color))
      }

      if (toPop.length >= 3) {
        this.addScore(toPop.length * 10)
        for (const c of toPop) this.grid.removeBubble(c.col, c.row)
        const floating = this.grid.findFloating()
        if (floating.length > 0) this.addScore(floating.length * 20)
        this.animateDrop(floating)
        if (this.grid.isEmpty()) { this.showResult('won'); return }
      }
    }

    if (this.grid.hasBubbleBelowY(this.dangerY)) this.showResult('lost')
  }

  private handleBombEffect(col: number, row: number) {
    const targets = this.grid.getBombTargets(col, row, 2)
    this.addScore(targets.length * 15)
    for (const t of targets) this.grid.removeBubble(t.col, t.row)
    const floating = this.grid.findFloating()
    if (floating.length > 0) this.addScore(floating.length * 20)
    this.animateDrop(floating)
    if (this.grid.isEmpty()) { this.showResult('won'); return }
    if (this.grid.hasBubbleBelowY(this.dangerY)) this.showResult('lost')
  }

  private handleLightningEffect(col: number, row: number) {
    const targets = this.grid.getCellsInRow(row)
    this.addScore(targets.length * 15)
    for (const t of targets) this.grid.removeBubble(t.col, t.row)
    const floating = this.grid.findFloating()
    if (floating.length > 0) this.addScore(floating.length * 20)
    this.animateDrop(floating)
    if (this.grid.isEmpty()) { this.showResult('won'); return }
    if (this.grid.hasBubbleBelowY(this.dangerY)) this.showResult('lost')
  }

  private handleColorBombEffect(col: number, row: number) {
    // Determine target colour from the nearest non-special occupied neighbour
    const neighbor = this.grid.getHexNeighbors(col, row).find(n => {
      const b = this.grid.getCell(n.col, n.row)?.bubble
      return b && !b.special
    })

    // Remove the color bomb itself first
    this.grid.removeBubble(col, row)

    if (neighbor) {
      const targetColor = this.grid.getCell(neighbor.col, neighbor.row)?.bubble?.color
      if (targetColor) {
        const targets = this.grid.getCellsOfColor(targetColor)
        this.addScore(targets.length * 15)
        for (const t of targets) this.grid.removeBubble(t.col, t.row)
        const floating = this.grid.findFloating()
        if (floating.length > 0) this.addScore(floating.length * 20)
        this.animateDrop(floating)
        if (this.grid.isEmpty()) { this.showResult('won'); return }
      }
    }

    if (this.grid.hasBubbleBelowY(this.dangerY)) this.showResult('lost')
  }

  private showResult(state: 'won' | 'lost') {
    this.gameState = state
    this.onGameOver?.(this.score, state)
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
    window.removeEventListener('keydown',   this.boundKeyDown)
    this.view.destroy({ children: true })
  }
}
