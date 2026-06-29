import { Application, Container, Graphics, Text } from 'pixi.js'
import { gsap } from 'gsap'
import {
  HUD_FONT, ACCENT, BLOCK_COLORS,
  BLOCK_COLS, BLOCK_W, BLOCK_H, BLOCK_GAP,
  GRID_W, GRID_TOP_PAD, LAUNCHER_PAD, BALL_RADIUS, BALL_SPEED,
  type LevelConfig,
} from '../constants'
import { Block } from '../entities/Block'
import { Ball  } from '../entities/Ball'

const FONT = `${HUD_FONT}, monospace`
const W    = () => window.innerWidth
const H    = () => window.innerHeight

export class BlazeShooterScene {
  view = new Container()

  private gameLayer = new Container()   // blocks
  private ballLayer = new Container()   // in-flight balls (above blocks)
  private aimLayer  = new Container()   // aim guide + launcher visual
  private fxLayer   = new Container()   // death particles
  private hudLayer  = new Container()   // score / level / splash

  private blocks: Block[] = []
  private balls:  Ball[]  = []

  // Layout
  private launcherX = 0
  private launcherY = 0
  private wallLeft  = 0
  private wallRight = 0

  // Aim
  private aimVx = 0
  private aimVy = -1   // straight up by default

  // Volley state
  private inFlight         = false
  private canFire          = false
  private ballsLanded      = 0
  private ballReturnCounter = 0
  private ballsInVolley    = 3    // grows with totalBlocksCleared
  private totalBlocksCleared = 0

  // Progression
  private currentLevel = 1
  private volleyCount  = 0

  // Score
  private score = 0

  // HUD
  private scoreText: Text
  private levelText: Text
  private splashText: Text

  // Graphics redrawn every frame for the aim guide
  private aimGraphics = new Graphics()

  // Safety flag — prevent async callbacks touching destroyed scene
  private destroyed = false

  private onGameOver: (score: number) => void

  private onMouseMoveCb: (e: MouseEvent) => void
  private onClickCb:     (e: MouseEvent) => void

  constructor(_app: Application, onGameOver: (score: number) => void) {
    this.onGameOver = onGameOver
    this.view.addChild(
      this.gameLayer,
      this.ballLayer,
      this.aimLayer,
      this.fxLayer,
      this.hudLayer,
    )
    this.aimLayer.addChild(this.aimGraphics)

    this.scoreText = new Text({ text: 'SCORE  0', style: { fontFamily: FONT, fontSize: 11, fill: '#ffffff' } })
    this.scoreText.position.set(14, 14)

    this.levelText = new Text({ text: 'LEVEL  1', style: { fontFamily: FONT, fontSize: 11, fill: ACCENT } })
    this.levelText.anchor.set(1, 0)

    this.splashText = new Text({ text: '', style: { fontFamily: FONT, fontSize: 26, fill: ACCENT } })
    this.splashText.anchor.set(0.5)
    this.splashText.alpha = 0

    this.hudLayer.addChild(this.scoreText, this.levelText, this.splashText)

    this.onMouseMoveCb = (e: MouseEvent) => this.handleMouseMove(e)
    this.onClickCb     = ()              => this.handleClick()
    window.addEventListener('mousemove', this.onMouseMoveCb)
    window.addEventListener('click',     this.onClickCb)

    this.onResize()
  }

  // ── public API ──────────────────────────────────────────────────────────────

  loadLevel(config: LevelConfig) {
    this.currentLevel = config.level
    this.volleyCount  = 0
    this.canFire      = false

    this.levelText.text = `LEVEL  ${config.level}`
    this.onResize()
    this.clearBlocks()
    this.spawnBlocks(config.rows)

    this.showSplash(`LEVEL  ${config.level}`, () => {
      if (!this.destroyed) this.canFire = true
    })
  }

  onResize() {
    this.launcherX = W() / 2
    this.launcherY = H() - LAUNCHER_PAD

    const originX    = (W() - GRID_W) / 2
    this.wallLeft    = originX
    this.wallRight   = originX + GRID_W

    this.levelText.position.set(W() - 14, 14)
    this.splashText.position.set(W() / 2, H() / 2)
  }

  update(delta: number) {
    const dt = Math.min(delta, 2.5)
    if (this.inFlight) {
      this.updateBalls(dt)
      this.checkCollisions()
    }
    this.drawAimGuide()
  }

  destroy() {
    this.destroyed = true
    window.removeEventListener('mousemove', this.onMouseMoveCb)
    window.removeEventListener('click',     this.onClickCb)
    for (const b of this.blocks) gsap.killTweensOf(b.view)
    for (const b of this.balls)  gsap.killTweensOf(b.view)
    gsap.killTweensOf(this.splashText)
    this.view.destroy({ children: true })
  }

  // ── input ────────────────────────────────────────────────────────────────────

  private handleMouseMove(e: MouseEvent) {
    const dx = e.clientX - this.launcherX
    const dy = e.clientY - this.launcherY
    if (dy >= -20) return

    // Clamp: at least 10° from horizontal so shots are never near-flat
    const angle   = Math.atan2(dy, dx)
    const minRad  = 0.175
    const clamped = Math.max(-Math.PI + minRad, Math.min(-minRad, angle))
    this.aimVx = Math.cos(clamped)
    this.aimVy = Math.sin(clamped)
  }

  private handleClick() {
    if (!this.canFire || this.inFlight) return
    this.fireBalls(this.aimVx * BALL_SPEED, this.aimVy * BALL_SPEED)
  }

  // ── fire + physics ───────────────────────────────────────────────────────────

  private fireBalls(vx: number, vy: number) {
    this.inFlight          = true
    this.canFire           = false
    this.ballsLanded       = 0
    this.ballReturnCounter = 0

    for (let i = 0; i < this.ballsInVolley; i++) {
      gsap.delayedCall(i * 0.08, () => {
        if (this.destroyed) return
        const ball = new Ball(this.launcherX, this.launcherY, vx, vy)
        this.balls.push(ball)
        this.ballLayer.addChild(ball.view)
      })
    }
  }

  private updateBalls(delta: number) {
    const wl      = this.wallLeft  + BALL_RADIUS
    const wr      = this.wallRight - BALL_RADIUS
    const ceiling = GRID_TOP_PAD   - BALL_RADIUS

    for (const ball of this.balls) {
      if (!ball.active) continue

      ball.hitCooldown = Math.max(0, ball.hitCooldown - 1)

      let { x, y, vx, vy } = ball

      x += vx * delta
      y += vy * delta

      // Wall bounces
      if (x < wl) { x = wl + (wl - x); vx =  Math.abs(vx) }
      if (x > wr) { x = wr - (x - wr); vx = -Math.abs(vx) }

      // Ceiling bounce
      if (y < ceiling) { y = ceiling + (ceiling - y); vy = Math.abs(vy) }

      // Land at launcher level
      if (y >= this.launcherY) {
        ball.active = false
        ball.vx = vx
        ball.vy = vy
        const retIdx = this.ballReturnCounter++
        gsap.to(ball.view, {
          x: this.launcherX,
          y: this.launcherY,
          duration: 0.18,
          delay:    retIdx * 0.035,
          ease: 'power2.in',
          onComplete: () => {
            if (this.destroyed) return
            this.ballLayer.removeChild(ball.view)
            ball.view.destroy()
            this.ballsLanded++
            if (this.ballsLanded >= this.ballsInVolley) {
              this.ballsLanded       = 0
              this.ballReturnCounter = 0
              this.endVolley()
            }
          },
        })
        continue
      }

      ball.vx = vx
      ball.vy = vy
      ball.setPos(x, y)
    }
  }

  // ── collision ────────────────────────────────────────────────────────────────

  private checkCollisions() {
    const hw = BLOCK_W / 2
    const hh = BLOCK_H / 2

    for (const ball of this.balls) {
      if (!ball.active || ball.hitCooldown > 0) continue

      for (let i = this.blocks.length - 1; i >= 0; i--) {
        const block = this.blocks[i]
        const bx = block.x + hw
        const by = block.y + hh
        const dx = ball.x  - bx
        const dy = ball.y  - by

        const overlapX = BALL_RADIUS + hw - Math.abs(dx)
        const overlapY = BALL_RADIUS + hh - Math.abs(dy)
        if (overlapX <= 0 || overlapY <= 0) continue

        // Resolve on the axis with smaller penetration depth
        if (overlapX < overlapY) {
          ball.vx = dx > 0 ? Math.abs(ball.vx) : -Math.abs(ball.vx)
        } else {
          ball.vy = dy > 0 ? Math.abs(ball.vy) : -Math.abs(ball.vy)
        }
        ball.hitCooldown = 3

        if (block.hit()) {
          this.addScore(block.maxHp * 10)
          this.spawnDeathParticles(block.x + hw, block.y + hh, block.color)
          this.gameLayer.removeChild(block.view)
          block.view.destroy()
          this.blocks.splice(i, 1)

          this.totalBlocksCleared++
          if (this.totalBlocksCleared % 5 === 0 && this.ballsInVolley < 20) {
            this.ballsInVolley++
          }
        }

        break  // each ball hits at most one block per frame
      }
    }
  }

  // ── end of volley ────────────────────────────────────────────────────────────

  private endVolley() {
    this.balls     = []
    this.inFlight  = false
    this.volleyCount++

    // Level up every 8 volleys
    if (this.volleyCount % 8 === 0) {
      this.currentLevel++
      this.levelText.text = `LEVEL  ${this.currentLevel}`
      this.showSplash(`LEVEL  ${this.currentLevel}`, () => {})
    }

    this.dropBlocks(() => {
      if (this.destroyed) return

      // Game over: any block at or below the danger line
      if (this.blocks.some(b => b.y + BLOCK_H >= this.launcherY - 10)) {
        this.showSplash('GAME OVER', () => {
          if (!this.destroyed) this.onGameOver(this.score)
        })
        return
      }

      this.spawnTopRow()
      this.canFire = true
    })
  }

  private dropBlocks(onComplete: () => void) {
    if (this.blocks.length === 0) { onComplete(); return }

    const dy = BLOCK_H + BLOCK_GAP
    let pending = this.blocks.length

    for (const block of this.blocks) {
      block.y += dy
      gsap.to(block.view, {
        y: block.y,
        duration: 0.32,
        ease: 'power2.inOut',
        onComplete: () => {
          if (this.destroyed) return
          pending--
          if (pending === 0) onComplete()
        },
      })
    }
  }

  private spawnTopRow() {
    const originX = (W() - GRID_W) / 2
    const maxHp   = Math.max(1, Math.ceil(this.currentLevel * 1.5))

    for (let c = 0; c < BLOCK_COLS; c++) {
      const hp    = Math.max(1, Math.ceil(Math.random() * maxHp))
      const color = BLOCK_COLORS[Math.floor(Math.random() * BLOCK_COLORS.length)]
      const x     = originX + c * (BLOCK_W + BLOCK_GAP)
      const block = new Block(x, GRID_TOP_PAD, hp, color)
      // Slide in from above
      block.view.y = GRID_TOP_PAD - BLOCK_H - BLOCK_GAP
      gsap.to(block.view, { y: GRID_TOP_PAD, duration: 0.28, ease: 'back.out(1.2)' })
      this.gameLayer.addChild(block.view)
      this.blocks.push(block)
    }
  }

  // ── visuals ──────────────────────────────────────────────────────────────────

  private drawAimGuide() {
    const g  = this.aimGraphics
    g.clear()

    const lx = this.launcherX
    const ly = this.launcherY

    // Subtle danger line
    g.rect(0, ly + 26, W(), 2).fill({ color: 0xff2222, alpha: 0.3 })

    // Launcher base
    g.circle(lx, ly, 22).fill({ color: 0x0d0d1a })
    g.circle(lx, ly, 22).stroke({ color: ACCENT, width: 2.5, alpha: 0.85 })
    g.circle(lx, ly, 12).fill({ color: 0x111128 })

    // Nozzle barrel
    const nx = lx + this.aimVx * 32
    const ny = ly + this.aimVy * 32
    g.moveTo(lx, ly).lineTo(nx, ny).stroke({ color: ACCENT, width: 6, cap: 'round' })
    g.circle(nx, ny, 6).fill({ color: 0xff9944 })

    // Ball count indicator (small dots above launcher)
    const maxDots = Math.min(this.ballsInVolley, 20)
    for (let i = 0; i < maxDots; i++) {
      const dot_x = lx + (i - (maxDots - 1) / 2) * 9
      g.circle(dot_x, ly - 34, 3).fill({ color: ACCENT, alpha: 0.8 })
    }

    // Aim guide dots (only when ready to fire)
    if (!this.canFire) return

    let ax = lx, ay = ly
    let avx = this.aimVx, avy = this.aimVy
    const wl = this.wallLeft  + BALL_RADIUS
    const wr = this.wallRight - BALL_RADIUS

    for (let i = 0; i < 55; i++) {
      ax += avx * 16
      ay += avy * 16

      if (ax < wl) { ax = wl; avx =  Math.abs(avx) }
      if (ax > wr) { ax = wr; avx = -Math.abs(avx) }
      if (ay < GRID_TOP_PAD) break

      const alpha = Math.max(0, 0.6 - i * 0.011)
      const r     = Math.max(1.5, 3.5 - i * 0.045)
      g.circle(ax, ay, r).fill({ color: ACCENT, alpha })
    }
  }

  private spawnDeathParticles(x: number, y: number, color: number) {
    const count = 10
    for (let i = 0; i < count; i++) {
      const p   = new Graphics()
      const ang = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6
      const dst = 18 + Math.random() * 22
      p.rect(-4, -4, 8, 8).fill({ color })
      p.angle = Math.random() * 60
      p.position.set(x, y)
      this.fxLayer.addChild(p)
      gsap.to(p, {
        x:        x + Math.cos(ang) * dst,
        y:        y + Math.sin(ang) * dst,
        alpha:    0,
        angle:    p.angle + 80,
        duration: 0.28 + Math.random() * 0.18,
        ease:     'power2.out',
        onComplete: () => { this.fxLayer.removeChild(p); p.destroy() },
      })
    }
  }

  // ── helpers ──────────────────────────────────────────────────────────────────

  private spawnBlocks(rows: LevelConfig['rows']) {
    const originX = (W() - GRID_W) / 2
    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < BLOCK_COLS; c++) {
        const cell = rows[r]?.[c]
        if (!cell) continue
        const x     = originX + c * (BLOCK_W + BLOCK_GAP)
        const y     = GRID_TOP_PAD + r * (BLOCK_H + BLOCK_GAP)
        const block = new Block(x, y, cell.hp, cell.color)
        this.gameLayer.addChild(block.view)
        this.blocks.push(block)
      }
    }
  }

  private clearBlocks() {
    for (const b of this.blocks) {
      this.gameLayer.removeChild(b.view)
      b.view.destroy()
    }
    this.blocks = []
  }

  private addScore(pts: number) {
    this.score += pts
    this.scoreText.text = `SCORE  ${this.score}`
    this.scoreText.scale.set(1.3)
    gsap.to(this.scoreText.scale, { x: 1, y: 1, duration: 0.18, ease: 'back.out' })
  }

  private showSplash(msg: string, onDone: () => void) {
    gsap.killTweensOf(this.splashText)
    this.splashText.text  = msg
    this.splashText.alpha = 0
    gsap.to(this.splashText, {
      alpha: 1, duration: 0.3, ease: 'power2.out',
      onComplete: () => gsap.to(this.splashText, {
        alpha: 0, duration: 0.4, delay: 1.1, ease: 'power2.in',
        onComplete: onDone,
      }),
    })
  }
}
