import { Application, Container, Graphics, Text } from 'pixi.js'
import { gsap } from 'gsap'
import {
  HUD_FONT, ACCENT, GRID_W,
  BLOCK_COLS, BLOCK_W, BLOCK_H, BLOCK_GAP, GRID_TOP_PAD,
  LAUNCHER_PAD, BALL_RADIUS, BALL_SPEED, MIN_AIM_ANGLE,
  BLOCK_COLORS, ROW_FILL_RATE, PICKUP_CHANCE, PICKUP_RADIUS,
  MAX_BALLS, FAST_FORWARD, MOVING_LAUNCH,
  SPECIAL_BLOCK_RATE, SPECIAL_BLOCK_TYPES,
  type LevelConfig,
} from '../constants'
import { Block }  from '../entities/Block'
import { Ball }   from '../entities/Ball'
import { Pickup } from '../entities/Pickup'
import { RetroAudio } from '../audio/RetroAudio'
import T from '@/data/strings.json'

const FONT = `${HUD_FONT}, monospace`
const W    = () => window.innerWidth
const H    = () => window.innerHeight

// Squared distance from point (px, py) to segment (x1, y1)–(x2, y2).
// Used for pickup collection so fast balls can't tunnel past a pickup.
function segmentDistSq(
  x1: number, y1: number, x2: number, y2: number, px: number, py: number,
): number {
  const dx    = x2 - x1
  const dy    = y2 - y1
  const lenSq = dx * dx + dy * dy
  let t = lenSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  const ex = px - (x1 + t * dx)
  const ey = py - (y1 + t * dy)
  return ex * ex + ey * ey
}

export class ColourBlazeScene {
  view = new Container()

  // Layer order (back → front)
  private gameLayer = new Container()  // blocks
  private ballLayer = new Container()  // in-flight balls
  private aimLayer  = new Container()  // aim guide + launcher visual
  private fxLayer   = new Container()  // death-particle explosions
  private hudLayer  = new Container()  // score / level / splash

  private aimG = new Graphics()

  // Entities
  private blocks:  Block[]  = []
  private balls:   Ball[]   = []
  private pickups: Pickup[] = []

  // Game state
  private score           = 0
  private currentLevel    = 1
  private ballsInVolley   = 3
  private inFlight        = false
  private canFire         = true
  private fastForward     = false
  private gameOver        = false
  private pendingLaunches = 0
  private destroyed       = false

  // Callbacks
  private onGameOver:   (score: number) => void
  private requestLevel: (level: number) => Promise<LevelConfig | null>

  // Aim (normalised direction, defaults straight up)
  private aimVx    = 0
  private aimVy    = -1
  private aimDirty = true

  // Touch input
  private touchAiming   = false
  private lastTouchTime = 0

  // Layout
  private viewScale = 1   // < 1 on screens narrower than the playfield
  private launcherX = 0
  private launcherY = 0
  private wallLeft  = 0
  private wallRight = 0
  private nextLauncherX: number | null = null   // where the first ball of the volley landed

  // GSAP handles
  private launchCalls: gsap.core.Tween[] = []

  // HUD nodes
  private scoreText: Text
  private levelText: Text
  private splashText: Text
  private ballCountText: Text
  private ffText: Text

  constructor(
    _app: Application,
    onGameOver: (score: number) => void,
    requestLevel: (level: number) => Promise<LevelConfig | null>,
  ) {
    this.onGameOver   = onGameOver
    this.requestLevel = requestLevel

    this.view.label      = 'ColourBlazeScene'
    this.gameLayer.label = 'gameLayer'
    this.ballLayer.label = 'ballLayer'
    this.aimLayer.label  = 'aimLayer'
    this.fxLayer.label   = 'fxLayer'
    this.hudLayer.label  = 'hudLayer'
    this.aimG.label      = 'aimGuide'

    this.aimLayer.addChild(this.aimG)

    this.view.addChild(
      this.gameLayer,
      this.ballLayer,
      this.aimLayer,
      this.fxLayer,
      this.hudLayer,
    )

    this.scoreText = new Text({
      text: T.colourBlaze.scoreDefault,
      style: { fontFamily: FONT, fontSize: 13, fill: '#ffffff' },
    })
    this.scoreText.label = 'scoreText'

    this.levelText = new Text({
      text: `${T.colourBlaze.levelPrefix} 1`,
      style: { fontFamily: FONT, fontSize: 11, fill: '#ffeecc' },
    })
    this.levelText.anchor.set(1, 0)
    this.levelText.label = 'levelText'

    this.splashText = new Text({
      text: '',
      style: { fontFamily: FONT, fontSize: 26, fill: ACCENT },
    })
    this.splashText.anchor.set(0.5)
    this.splashText.alpha = 0
    this.splashText.label = 'splashText'

    this.ballCountText = new Text({
      text: `${T.colourBlaze.ballCountPrefix}${this.ballsInVolley}`,
      style: { fontFamily: FONT, fontSize: 10, fill: '#ffcc44' },
    })
    this.ballCountText.anchor.set(0.5)
    this.ballCountText.label = 'ballCountText'

    this.ffText = new Text({
      text: T.colourBlaze.fastForward,
      style: { fontFamily: FONT, fontSize: 14, fill: ACCENT },
    })
    this.ffText.anchor.set(0.5)
    this.ffText.alpha = 0
    this.ffText.label = 'fastForwardText'

    this.hudLayer.addChild(
      this.scoreText, this.levelText, this.splashText,
      this.ballCountText, this.ffText,
    )

    window.addEventListener('mousemove', this.handleMouseMove)
    window.addEventListener('click', this.handleClick)
    window.addEventListener('touchstart', this.handleTouchStart, { passive: true })
    window.addEventListener('touchmove',  this.handleTouchMove,  { passive: false })
    window.addEventListener('touchend',   this.handleTouchEnd,   { passive: false })

    this.onResize()
  }

  // ── public API ──────────────────────────────────────────────────────────────

  loadLevel(config: LevelConfig) {
    this.currentLevel   = config.level
    this.levelText.text = `${T.colourBlaze.levelPrefix} ${config.level}`
    this.onResize()

    // Clear any blocks and pickups from the previous level
    for (const block of this.blocks) block.view.destroy({ children: true })
    this.blocks = []
    for (const pickup of this.pickups) pickup.view.destroy({ children: true })
    this.pickups = []

    // Build the block grid — centred horizontally, starting at GRID_TOP_PAD.
    // null cells are gaps.
    config.rows.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (!cell) return
        const x = this.wallLeft + c * (BLOCK_W + BLOCK_GAP)
        const y = GRID_TOP_PAD  + r * (BLOCK_H + BLOCK_GAP)
        const block = new Block(x, y, cell.hp, cell.color)
        this.blocks.push(block)
        this.gameLayer.addChild(block.view)
      })
    })

    this.updateDangerState()
    this.showSplash(`${T.colourBlaze.levelSplash}  ${config.level}`)
  }

  onResize() {
    // Fit the fixed-width playfield to narrow screens: scale the whole scene
    // down and lay everything out in design units (screen px ÷ scale).
    this.viewScale = Math.min(1, W() / (GRID_W + 24))
    this.view.scale.set(this.viewScale)

    const dw = W() / this.viewScale
    const dh = H() / this.viewScale

    this.launcherY = dh - LAUNCHER_PAD

    const originX  = (dw - GRID_W) / 2
    this.wallLeft  = originX
    this.wallRight = originX + GRID_W
    this.launcherX = originX + GRID_W / 2

    // When the grid hugs the left edge (mobile), drop the HUD row below the
    // DOM BackButton (~46 screen px tall) instead of underneath it.
    const hudY = (this.wallLeft + 2) * this.viewScale < 100 ? 56 / this.viewScale : 26
    this.scoreText.position.set(this.wallLeft + 2, hudY)
    this.levelText.position.set(this.wallRight - 2, hudY)
    this.splashText.position.set(dw / 2, dh / 2)
    this.positionLauncherHud()

    this.aimDirty = true
  }

  private positionLauncherHud() {
    this.ballCountText.position.set(this.launcherX, this.launcherY + 30)
    this.ffText.position.set(this.launcherX, this.launcherY - 34)
  }

  update(delta: number) {
    if (this.aimDirty) {
      this.drawAimGuide()
      this.aimDirty = false
    }
    this.updateBalls(this.inFlight && this.fastForward ? delta * FAST_FORWARD : delta)
  }

  destroy() {
    this.destroyed = true
    window.removeEventListener('mousemove', this.handleMouseMove)
    window.removeEventListener('click', this.handleClick)
    window.removeEventListener('touchstart', this.handleTouchStart)
    window.removeEventListener('touchmove',  this.handleTouchMove)
    window.removeEventListener('touchend',   this.handleTouchEnd)
    for (const call of this.launchCalls) call.kill()
    for (const child of this.fxLayer.children)   gsap.killTweensOf(child)
    for (const child of this.ballLayer.children) gsap.killTweensOf(child)
    for (const child of this.gameLayer.children) {
      gsap.killTweensOf(child)
      gsap.killTweensOf(child.scale)   // pickup collect pop tween
    }
    gsap.killTweensOf(this.scoreText.scale)
    gsap.killTweensOf(this.splashText)
    this.view.destroy({ children: true })
  }

  // ── input ────────────────────────────────────────────────────────────────────

  private updateAim(cx: number, cy: number) {
    const dx = cx - this.launcherX
    const dy = cy - this.launcherY
    let angle = Math.atan2(dy, dx)

    // Clamp to the upward hemisphere, at least MIN_AIM_ANGLE above horizontal
    if (angle > -MIN_AIM_ANGLE) {
      angle = angle <= Math.PI / 2 ? -MIN_AIM_ANGLE : -Math.PI + MIN_AIM_ANGLE
    } else if (angle < -Math.PI + MIN_AIM_ANGLE) {
      angle = -Math.PI + MIN_AIM_ANGLE
    }

    this.aimVx    = Math.cos(angle)
    this.aimVy    = Math.sin(angle)
    this.aimDirty = true
  }

  private enableFastForward() {
    if (!this.fastForward) {
      this.fastForward  = true
      this.ffText.alpha = 1
    }
  }

  private handleMouseMove = (e: MouseEvent) => {
    this.updateAim(e.clientX / this.viewScale, e.clientY / this.viewScale)
  }

  private handleClick = (e: MouseEvent) => {
    // Ignore the synthetic click browsers fire after a touch sequence
    if (Date.now() - this.lastTouchTime < 500) return
    // Only clicks on the canvas count — not BackButton or overlay buttons
    if (!(e.target instanceof HTMLCanvasElement)) return

    if (this.inFlight) {
      this.enableFastForward()
      return
    }
    this.fire()
  }

  // Touch: drag anywhere on the canvas to aim, release to fire.
  private handleTouchStart = (e: TouchEvent) => {
    this.lastTouchTime = Date.now()
    if (!(e.target instanceof HTMLCanvasElement)) return

    if (this.inFlight) {
      this.enableFastForward()
      return
    }

    const t = e.touches[0]
    if (!t || !this.canFire) return
    this.touchAiming = true
    this.updateAim(t.clientX / this.viewScale, t.clientY / this.viewScale)
  }

  private handleTouchMove = (e: TouchEvent) => {
    if (!this.touchAiming) return
    e.preventDefault()   // stop the page scrolling while aiming
    this.lastTouchTime = Date.now()
    const t = e.touches[0]
    if (t) this.updateAim(t.clientX / this.viewScale, t.clientY / this.viewScale)
  }

  private handleTouchEnd = (e: TouchEvent) => {
    this.lastTouchTime = Date.now()
    if (!this.touchAiming) return
    e.preventDefault()   // suppress the synthetic mouse events
    this.touchAiming = false
    this.fire()
  }

  private fire() {
    if (!this.canFire) return
    this.inFlight = true
    this.canFire  = false
    this.aimDirty = true
    RetroAudio.fire()

    const vx = this.aimVx * BALL_SPEED
    const vy = this.aimVy * BALL_SPEED

    this.launchCalls     = []
    this.pendingLaunches = this.ballsInVolley
    for (let i = 0; i < this.ballsInVolley; i++) {
      this.launchCalls.push(gsap.delayedCall(i * 0.08, () => {
        if (this.destroyed) return
        this.pendingLaunches--
        const ball = new Ball(this.launcherX, this.launcherY, vx, vy)
        this.balls.push(ball)
        this.ballLayer.addChild(ball.view)
      }))
    }
  }

  // ── physics ──────────────────────────────────────────────────────────────────

  private updateBalls(delta: number) {
    if (!this.inFlight) return

    let anyActive = false
    for (const ball of this.balls) {
      if (!ball.active) continue
      anyActive = true

      if (ball.hitCooldown > 0) ball.hitCooldown -= delta

      const px = ball.x
      const py = ball.y
      let nx = ball.x + ball.vx * delta
      let ny = ball.y + ball.vy * delta

      // Wall bounce — grid edges, not screen edges. Math.abs prevents tunnelling.
      if (nx - BALL_RADIUS < this.wallLeft) {
        nx = this.wallLeft + BALL_RADIUS
        ball.vx = Math.abs(ball.vx)
      }
      if (nx + BALL_RADIUS > this.wallRight) {
        nx = this.wallRight - BALL_RADIUS
        ball.vx = -Math.abs(ball.vx)
      }

      // Ceiling bounce
      if (ny - BALL_RADIUS < 0) {
        ny = BALL_RADIUS
        ball.vy = Math.abs(ball.vy)
      }

      // Land at the launcher line
      if (ny >= this.launcherY) {
        ball.setPos(nx, this.launcherY)
        this.collectPickups(px, py, nx, this.launcherY)
        // First ball down marks the next volley's launch point
        if (this.nextLauncherX === null) {
          this.nextLauncherX = Math.max(
            this.wallLeft  + BALL_RADIUS + 20,
            Math.min(this.wallRight - BALL_RADIUS - 20, nx),
          )
        }
        ball.active = false
        continue
      }

      ball.setPos(nx, ny)
      this.collectPickups(px, py, nx, ny)
      this.checkCollisions(ball)
    }

    if (!anyActive && this.pendingLaunches === 0 && this.balls.length > 0) {
      this.endVolley()
    }
  }

  private checkCollisions(ball: Ball) {
    if (ball.hitCooldown > 0) return

    for (const block of this.blocks) {
      const left   = block.x - BALL_RADIUS
      const right  = block.x + BLOCK_W + BALL_RADIUS
      const top    = block.y - BALL_RADIUS
      const bottom = block.y + BLOCK_H + BALL_RADIUS
      if (ball.x <= left || ball.x >= right || ball.y <= top || ball.y >= bottom) continue

      // Resolve on the axis with the smaller penetration depth
      const penLeft   = ball.x - left
      const penRight  = right - ball.x
      const penTop    = ball.y - top
      const penBottom = bottom - ball.y
      const minPen    = Math.min(penLeft, penRight, penTop, penBottom)

      if (minPen === penLeft) {
        ball.vx = -Math.abs(ball.vx)
        ball.setPos(left, ball.y)
      } else if (minPen === penRight) {
        ball.vx = Math.abs(ball.vx)
        ball.setPos(right, ball.y)
      } else if (minPen === penTop) {
        ball.vy = -Math.abs(ball.vy)
        ball.setPos(ball.x, top)
      } else {
        ball.vy = Math.abs(ball.vy)
        ball.setPos(ball.x, bottom)
      }

      ball.hitCooldown = 3
      this.hitBlock(block)
      break
    }
  }

  private hitBlock(block: Block) {
    if (!block.hit()) {
      RetroAudio.hit()
      return
    }
    this.destroyBlock(block)
  }

  // Shared destruction path — also the entry point for bomb/laser chains.
  private destroyBlock(block: Block) {
    if (!this.blocks.includes(block)) return   // already destroyed by a chain
    this.blocks = this.blocks.filter(b => b !== block)

    RetroAudio.brickBreak()
    this.addScore(block.maxHp * 10)
    this.spawnDeathParticles(block)
    gsap.killTweensOf(block.view)   // danger pulse, if any
    block.view.destroy({ children: true })

    if (block.special === 'bomb')       this.explodeBomb(block)
    else if (block.special === 'laser') this.fireLaser(block)
  }

  // Bomb: destroys all non-steel blocks in the 8 surrounding cells (bombs chain).
  private explodeBomb(block: Block) {
    for (const b of [...this.blocks]) {
      if (b.special === 'steel') continue
      if (
        Math.abs(b.x - block.x) <= BLOCK_W + BLOCK_GAP &&
        Math.abs(b.y - block.y) <= BLOCK_H + BLOCK_GAP
      ) {
        this.destroyBlock(b)
      }
    }
  }

  // Laser: clears the block's entire row and column (non-steel), with a beam flash.
  private fireLaser(block: Block) {
    const beam = new Graphics()
    beam.label = 'laserBeam'
    beam.rect(this.wallLeft, block.y + BLOCK_H / 2 - 4, GRID_W, 8)
      .fill({ color: 0xfff2a8, alpha: 0.9 })
    beam.rect(block.x + BLOCK_W / 2 - 4, 0, 8, this.launcherY)
      .fill({ color: 0xfff2a8, alpha: 0.9 })
    this.fxLayer.addChild(beam)
    gsap.to(beam, {
      alpha: 0, duration: 0.35, ease: 'power2.out',
      onComplete: () => { if (!beam.destroyed) beam.destroy() },
    })

    for (const b of [...this.blocks]) {
      if (b.special === 'steel') continue
      const sameRow = Math.abs(b.y - block.y) < BLOCK_H / 2
      const sameCol = Math.abs(b.x - block.x) < BLOCK_W / 2
      if (sameRow || sameCol) this.destroyBlock(b)
    }
  }

  // ── pickups ──────────────────────────────────────────────────────────────────

  // Segment test against the ball's movement this tick — a fast-forwarded ball
  // can travel further per tick than the pickup's catch radius.
  private collectPickups(x1: number, y1: number, x2: number, y2: number) {
    if (this.pickups.length === 0) return
    const catchR = BALL_RADIUS + PICKUP_RADIUS

    this.pickups = this.pickups.filter(p => {
      if (segmentDistSq(x1, y1, x2, y2, p.x, p.y) > catchR * catchR) return true
      this.collectPickup(p)
      return false
    })
  }

  private collectPickup(p: Pickup) {
    if (this.ballsInVolley < MAX_BALLS) this.ballsInVolley++
    this.ballCountText.text = `${T.colourBlaze.ballCountPrefix}${this.ballsInVolley}`
    RetroAudio.collect()

    // Pop the pickup and float a +1 up from where it was
    gsap.to(p.view.scale, { x: 1.6, y: 1.6, duration: 0.18, ease: 'back.out(2)' })
    gsap.to(p.view, {
      alpha: 0, duration: 0.18, ease: 'power2.out',
      onComplete: () => { if (!p.view.destroyed) p.view.destroy({ children: true }) },
    })

    const t = new Text({
      text:  T.colourBlaze.plusOne,
      style: { fontFamily: FONT, fontSize: 10, fill: '#ffcc44' },
    })
    t.anchor.set(0.5)
    t.position.set(p.x, p.y)
    t.label = 'plusOneFx'
    this.fxLayer.addChild(t)
    gsap.to(t, {
      y: p.y - 28, alpha: 0, duration: 0.5, ease: 'power2.out',
      onComplete: () => { if (!t.destroyed) t.destroy() },
    })
  }

  // ── turn cycle ───────────────────────────────────────────────────────────────

  private endVolley() {
    this.inFlight     = false
    this.fastForward  = false
    this.ffText.alpha = 0

    // Next volley launches from where the first ball landed
    if (MOVING_LAUNCH && this.nextLauncherX !== null) {
      this.launcherX = this.nextLauncherX
      this.positionLauncherHud()
    }
    this.nextLauncherX = null

    // Tween all landed balls back to the launcher, then advance the turn
    const returning = this.balls
    this.balls = []
    let done = 0

    returning.forEach((ball, i) => {
      gsap.to(ball.view, {
        x: this.launcherX, y: this.launcherY,
        duration: 0.25, delay: i * 0.03, ease: 'power2.in',
        onComplete: () => {
          if (!ball.view.destroyed) ball.view.destroy()
          done++
          if (done === returning.length) this.afterVolley()
        },
      })
    })

    if (returning.length === 0) this.afterVolley()
  }

  private afterVolley() {
    if (this.destroyed || this.gameOver) return

    // Board cleared when no destructible blocks remain — leftover steel crumbles
    if (!this.blocks.some(b => b.special !== 'steel')) {
      for (const b of this.blocks) {
        this.spawnDeathParticles(b)
        gsap.killTweensOf(b.view)
        b.view.destroy({ children: true })
      }
      this.blocks = []
      void this.levelUp()
      return
    }

    this.dropBlocks()
  }

  private dropBlocks() {
    const dropBy = BLOCK_H + BLOCK_GAP
    const total  = this.blocks.length + this.pickups.length
    let   done   = 0
    const onDone = () => {
      done++
      if (done === total) this.afterDrop()
    }

    for (const block of this.blocks) {
      block.y += dropBy
      gsap.to(block.view, { y: block.y, duration: 0.32, ease: 'power2.inOut', onComplete: onDone })
    }
    for (const pickup of this.pickups) {
      pickup.y += dropBy
      gsap.to(pickup.view, { y: pickup.y, duration: 0.32, ease: 'power2.inOut', onComplete: onDone })
    }
  }

  private afterDrop() {
    if (this.destroyed || this.gameOver) return

    // Steel blocks crumble harmlessly at the lose line — they never end the run
    for (const b of [...this.blocks]) {
      if (b.special === 'steel' && b.y + BLOCK_H >= this.launcherY - 10) {
        this.blocks = this.blocks.filter(x => x !== b)
        this.spawnDeathParticles(b)
        gsap.killTweensOf(b.view)
        b.view.destroy({ children: true })
      }
    }

    // Lose: a block reached the launcher line
    if (this.blocks.some(b => b.y + BLOCK_H >= this.launcherY - 10)) {
      this.gameOver = true
      this.canFire  = false
      this.aimDirty = true
      RetroAudio.gameOver()
      this.showSplash(T.colourBlaze.gameOver)
      this.onGameOver(this.score)
      return
    }

    // Pickups that reached the launcher line are collected automatically
    for (const pickup of [...this.pickups]) {
      if (pickup.y + PICKUP_RADIUS >= this.launcherY - 10) {
        this.pickups = this.pickups.filter(p => p !== pickup)
        this.collectPickup(pickup)
      }
    }

    this.updateDangerState()
    this.spawnTopRow()
    this.canFire  = true
    this.aimDirty = true
  }

  // Warn on blocks that will cross the lose line on the NEXT descent:
  // red border + slow alpha pulse.
  private updateDangerState() {
    const warnY = this.launcherY - 10 - (BLOCK_H + BLOCK_GAP)

    for (const block of this.blocks) {
      // Steel never triggers the lose condition, so it never warns
      const inDanger = block.special !== 'steel' && block.y + BLOCK_H >= warnY
      block.setDanger(inDanger)

      if (inDanger && !gsap.isTweening(block.view)) {
        gsap.to(block.view, {
          alpha: 0.55, duration: 0.35, ease: 'sine.inOut', yoyo: true, repeat: -1,
        })
      } else if (!inDanger) {
        gsap.killTweensOf(block.view)
        block.view.alpha = 1
      }
    }
  }

  private spawnTopRow() {
    const maxHp     = Math.max(1, Math.ceil(this.currentLevel * 1.5))
    const slideFrom = -(BLOCK_H + BLOCK_GAP)

    // Each cell gets a block with ROW_FILL_RATE probability — never an empty row
    const hasBlock = Array.from({ length: BLOCK_COLS }, () => Math.random() < ROW_FILL_RATE)
    if (!hasBlock.some(Boolean)) hasBlock[Math.floor(Math.random() * BLOCK_COLS)] = true

    for (let c = 0; c < BLOCK_COLS; c++) {
      const x = this.wallLeft + c * (BLOCK_W + BLOCK_GAP)

      if (hasBlock[c]) {
        // Occasionally a special block — bomb, laser, or steel (1 HP; steel is immune)
        const special = Math.random() < SPECIAL_BLOCK_RATE
          ? SPECIAL_BLOCK_TYPES[Math.floor(Math.random() * SPECIAL_BLOCK_TYPES.length)]
          : undefined
        const hp    = special ? 1 : 1 + Math.floor(Math.random() * maxHp)
        const color = BLOCK_COLORS[Math.floor(Math.random() * BLOCK_COLORS.length)]
        const block = new Block(x, GRID_TOP_PAD, hp, color, special)
        this.blocks.push(block)
        this.gameLayer.addChild(block.view)

        block.view.y = GRID_TOP_PAD + slideFrom
        gsap.to(block.view, { y: GRID_TOP_PAD, duration: 0.4, ease: 'back.out(1.2)' })
      } else if (Math.random() < PICKUP_CHANCE) {
        // Empty lane → chance of a +1 ball pickup, centred in the cell
        const pickup = new Pickup(x + BLOCK_W / 2, GRID_TOP_PAD + BLOCK_H / 2)
        this.pickups.push(pickup)
        this.gameLayer.addChild(pickup.view)

        pickup.view.y = pickup.y + slideFrom
        gsap.to(pickup.view, { y: pickup.y, duration: 0.4, ease: 'back.out(1.2)' })
      }
    }
  }

  private async levelUp() {
    this.currentLevel++
    const config = await this.requestLevel(this.currentLevel)
    if (this.destroyed || !config) return

    RetroAudio.levelUp()
    this.loadLevel(config)
    this.canFire  = true
    this.aimDirty = true
  }

  // ── rendering ────────────────────────────────────────────────────────────────

  private drawAimGuide() {
    const g = this.aimG
    g.clear()

    // Launcher base
    g.circle(this.launcherX, this.launcherY, 16).fill({ color: 0x222222 })
    g.circle(this.launcherX, this.launcherY, 16).stroke({ color: ACCENT, width: 2 })
    g.circle(this.launcherX, this.launcherY, BALL_RADIUS).fill({ color: 0xff8800 })

    if (!this.canFire || this.inFlight) return

    // Dotted guide simulating wall bounces, fading out
    let x  = this.launcherX
    let y  = this.launcherY
    let vx = this.aimVx
    const vy = this.aimVy
    const STEPS   = 55
    const SPACING = 16

    for (let i = 0; i < STEPS; i++) {
      x += vx * SPACING
      y += vy * SPACING

      if (x - BALL_RADIUS < this.wallLeft) {
        x  = this.wallLeft + BALL_RADIUS
        vx = Math.abs(vx)
      }
      if (x + BALL_RADIUS > this.wallRight) {
        x  = this.wallRight - BALL_RADIUS
        vx = -Math.abs(vx)
      }
      if (y < GRID_TOP_PAD) break
      if (this.guideBlocked(x, y)) break   // stop at the first block, like a real ball

      g.circle(x, y, 3).fill({ color: 0xffffff, alpha: 0.6 * (1 - i / STEPS) })
    }
  }

  // Same inflated-AABB test as checkCollisions, for the aim guide preview.
  private guideBlocked(x: number, y: number): boolean {
    for (const block of this.blocks) {
      if (
        x > block.x - BALL_RADIUS && x < block.x + BLOCK_W + BALL_RADIUS &&
        y > block.y - BALL_RADIUS && y < block.y + BLOCK_H + BALL_RADIUS
      ) return true
    }
    return false
  }

  private spawnDeathParticles(block: Block) {
    const cx = block.x + BLOCK_W / 2
    const cy = block.y + BLOCK_H / 2

    for (let i = 0; i < 10; i++) {
      const p    = new Graphics()
      const size = 3 + Math.random() * 4
      p.label = 'particle'
      p.rect(-size / 2, -size / 2, size, size).fill({ color: block.color })
      p.position.set(cx, cy)
      this.fxLayer.addChild(p)

      const ang  = Math.random() * Math.PI * 2
      const dist = 24 + Math.random() * 40
      gsap.to(p, {
        x: cx + Math.cos(ang) * dist,
        y: cy + Math.sin(ang) * dist,
        alpha: 0,
        duration: 0.28 + Math.random() * 0.18,
        ease: 'power2.out',
        onComplete: () => { if (!p.destroyed) p.destroy() },
      })
    }
  }

  // ── helpers ──────────────────────────────────────────────────────────────────

  private addScore(points: number) {
    this.score += points
    this.scoreText.text = String(this.score)
    this.scoreText.scale.set(1.3)
    gsap.to(this.scoreText.scale, { x: 1, y: 1, duration: 0.25, ease: 'back.out(2)' })
  }

  private showSplash(msg: string) {
    gsap.killTweensOf(this.splashText)
    this.splashText.text  = msg
    this.splashText.alpha = 0
    gsap.to(this.splashText, {
      alpha: 1, duration: 0.3, ease: 'power2.out',
      onComplete: () => gsap.to(this.splashText, {
        alpha: 0, duration: 0.4, delay: 1.1, ease: 'power2.in',
      }),
    })
  }
}
