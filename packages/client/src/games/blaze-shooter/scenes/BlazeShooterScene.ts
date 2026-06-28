import { Application, Container, Graphics, Text } from 'pixi.js'
import { gsap } from 'gsap'
import {
  HUD_FONT, PLAYER_SPEED, BULLET_SPEED, FIRE_RATE, ACCENT,
  BRICK_W, BRICK_H, BRICK_GAP, BRICK_COLS, BRICK_ROWS,
  levelClearBonus,
  type LevelConfig,
} from '../constants'

const FONT = `${HUD_FONT}, monospace`

const W = () => window.innerWidth
const H = () => window.innerHeight

// ── tiny entity types ────────────────────────────────────────────────────────

interface Bullet {
  x: number; y: number
  vx: number; vy: number
  view: Graphics
  owner: 'player' | 'enemy'
}

interface Enemy {
  x: number; y: number
  vx: number; vy: number
  hp: number
  maxHp: number
  isBoss: boolean
  view: Container
  body: Graphics
  hpBar: Graphics
}

interface Brick {
  x: number; y: number
  view: Graphics
}

// ── scene ────────────────────────────────────────────────────────────────────

export class BlazeShooterScene {
  view = new Container()

  private currentLevel = 0
  private score        = 0
  private done         = false
  private spawning     = false
  private fireTimer    = 0
  private keys         = new Set<string>()

  private gameLayer    = new Container()
  private hudLayer     = new Container()
  private popLayer     = new Container()

  private player:  Graphics
  private playerX  = 0
  private playerY  = 0
  private bullets: Bullet[]       = []
  private enemies: Enemy[]        = []
  private bricks:  Brick[]        = []
  private brickBorder: Graphics | null = null

  private scoreText: Text
  private levelText: Text
  private splashText: Text

  private requestLevel: (n: number) => Promise<LevelConfig | null>
  private onGameOver:   (score: number) => void

  private onKeyDown: (e: KeyboardEvent) => void
  private onKeyUp:   (e: KeyboardEvent) => void

  constructor(
    _app: Application,
    requestLevel: (n: number) => Promise<LevelConfig | null>,
    onGameOver: (score: number) => void,
  ) {
    this.requestLevel = requestLevel
    this.onGameOver   = onGameOver
    this.view.addChild(this.gameLayer, this.popLayer, this.hudLayer)

    // player ship — simple triangle
    this.player = new Graphics()
    this.gameLayer.addChild(this.player)
    this.drawPlayer()

    // HUD
    this.scoreText = new Text({ text: 'SCORE  0', style: { fontFamily: FONT, fontSize: 12, fill: '#ffffff' } })
    this.scoreText.position.set(14, 14)

    this.levelText = new Text({ text: '', style: { fontFamily: FONT, fontSize: 12, fill: ACCENT } })
    this.levelText.anchor.set(1, 0)

    this.splashText = new Text({ text: '', style: { fontFamily: FONT, fontSize: 28, fill: ACCENT } })
    this.splashText.anchor.set(0.5)
    this.splashText.alpha = 0

    this.hudLayer.addChild(this.scoreText, this.levelText, this.splashText)

    this.onKeyDown = (e: KeyboardEvent) => this.keys.add(e.code)
    this.onKeyUp   = (e: KeyboardEvent) => this.keys.delete(e.code)
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup',   this.onKeyUp)

    this.onResize()
  }

  // ── public API ──────────────────────────────────────────────────────────────

  loadLevel(config: LevelConfig) {
    this.currentLevel = config.level
    this.spawning     = true
    this.done         = false
    this.clearEnemies()
    this.clearBullets()

    this.levelText.text = `LEVEL  ${config.level}`
    this.onResize()

    this.clearBricks()
    this.spawnBricks(config.level)

    this.showSplash(config.boss ? `BOSS  LEVEL  ${config.level}` : `LEVEL  ${config.level}`, () => {
      this.spawning = false
      this.spawnEnemies(config)
    })
  }

  onResize() {
    this.playerX = Math.min(this.playerX || W() / 2, W() - 20)
    this.playerY = Math.min(this.playerY || H() - 80, H() - 20)
    this.player.position.set(this.playerX, this.playerY)
    this.levelText.position.set(W() - 14, 14)
    this.splashText.position.set(W() / 2, H() / 2)
  }

  update(delta: number) {
    if (this.done) return

    this.handleInput(delta)
    this.moveBullets(delta)
    this.moveEnemies(delta)
    this.checkCollisions()

    if (this.enemies.length === 0 && !this.spawning && !this.done) {
      this.done = true
      this.handleLevelComplete()
    }
  }

  destroy() {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup',   this.onKeyUp)
    gsap.killTweensOf(this.splashText)
    this.view.destroy({ children: true })
  }

  // ── private ─────────────────────────────────────────────────────────────────

  private drawPlayer() {
    this.player.clear()
    this.player.moveTo(0, -18).lineTo(12, 12).lineTo(0, 6).lineTo(-12, 12).closePath()
    this.player.fill({ color: 0xff6600 })
    this.player.stroke({ color: 0xffaa44, width: 1.5 })
  }

  private handleInput(delta: number) {
    const spd = PLAYER_SPEED * delta
    if (this.keys.has('ArrowLeft')  || this.keys.has('KeyA')) this.playerX = Math.max(16, this.playerX - spd)
    if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) this.playerX = Math.min(W() - 16, this.playerX + spd)
    if (this.keys.has('ArrowUp')    || this.keys.has('KeyW')) this.playerY = Math.max(16, this.playerY - spd)
    if (this.keys.has('ArrowDown')  || this.keys.has('KeyS')) this.playerY = Math.min(H() - 16, this.playerY + spd)
    this.player.position.set(this.playerX, this.playerY)

    this.fireTimer = Math.max(0, this.fireTimer - delta)
    if ((this.keys.has('Space') || this.keys.has('KeyZ')) && this.fireTimer === 0) {
      this.fireBullet()
      this.fireTimer = FIRE_RATE
    }
  }

  private fireBullet() {
    const g = new Graphics()
    g.rect(-3, -8, 6, 16).fill({ color: 0xff8800 })
    g.position.set(this.playerX, this.playerY - 18)
    this.gameLayer.addChild(g)
    this.bullets.push({ x: this.playerX, y: this.playerY - 18, vx: 0, vy: -BULLET_SPEED, view: g, owner: 'player' })
  }

  private moveBullets(delta: number) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i]
      b.x += b.vx * delta
      b.y += b.vy * delta
      b.view.position.set(b.x, b.y)
      if (b.y < -20 || b.y > H() + 20 || b.x < -20 || b.x > W() + 20) {
        this.gameLayer.removeChild(b.view)
        b.view.destroy()
        this.bullets.splice(i, 1)
      }
    }
  }

  private spawnEnemies(config: LevelConfig) {
    const cols    = Math.min(config.enemy_count, 8)
    const rows    = Math.ceil(config.enemy_count / cols)
    const spacingX = W() / (cols + 1)
    const spacingY = 60
    let spawned   = 0

    for (let r = 0; r < rows && spawned < config.enemy_count; r++) {
      for (let c = 0; c < cols && spawned < config.enemy_count; c++) {
        const isBoss = config.boss && spawned === 0
        const hp     = isBoss ? config.enemy_hp * 5 : config.enemy_hp
        const e      = this.buildEnemy(
          spacingX * (c + 1),
          60 + r * spacingY,
          config.enemy_speed,
          hp,
          isBoss,
        )
        this.enemies.push(e)
        this.gameLayer.addChild(e.view)
        spawned++
      }
    }
  }

  private buildEnemy(x: number, y: number, speed: number, hp: number, isBoss: boolean): Enemy {
    const view  = new Container()
    const body  = new Graphics()
    const hpBar = new Graphics()

    const size = isBoss ? 36 : 18
    body.rect(-size, -size, size * 2, size * 2).fill({ color: isBoss ? 0xcc2200 : 0xff3300 })
    body.stroke({ color: 0xff6600, width: 2 })

    view.addChild(body, hpBar)
    view.position.set(x, y)

    const e: Enemy = { x, y, vx: speed, vy: 0, hp, maxHp: hp, isBoss, view, body, hpBar }
    this.drawHpBar(e)
    return e
  }

  private drawHpBar(e: Enemy) {
    const w = e.isBoss ? 72 : 36
    const pct = e.hp / e.maxHp
    e.hpBar.clear()
    e.hpBar.rect(-w / 2, e.isBoss ? 44 : 24, w, 4).fill({ color: 0x333333 })
    e.hpBar.rect(-w / 2, e.isBoss ? 44 : 24, w * pct, 4).fill({ color: pct > 0.5 ? 0x00ff99 : pct > 0.25 ? 0xffaa00 : 0xff2200 })
  }

  private moveEnemies(delta: number) {
    const margin = 40
    for (const e of this.enemies) {
      e.x += e.vx * delta
      if (e.x > W() - margin || e.x < margin) {
        e.vx *= -1
        e.y  += 24
      }
      e.y = Math.min(e.y, H() - 80)
      e.view.position.set(e.x, e.y)
    }
  }

  private checkCollisions() {
    for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
      const b = this.bullets[bi]
      if (b.owner !== 'player') continue

      // enemy hits
      let consumed = false
      for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
        const e   = this.enemies[ei]
        const hit = Math.abs(b.x - e.x) < (e.isBoss ? 36 : 18)
                 && Math.abs(b.y - e.y) < (e.isBoss ? 36 : 18)

        if (hit) {
          this.gameLayer.removeChild(b.view); b.view.destroy()
          this.bullets.splice(bi, 1)
          consumed = true

          e.hp--
          this.drawHpBar(e)
          if (e.hp <= 0) {
            this.addScore(e.isBoss ? 1000 : 100)
            this.spawnPop(e.x, e.y, e.isBoss)
            this.gameLayer.removeChild(e.view); e.view.destroy()
            this.enemies.splice(ei, 1)
          }
          break
        }
      }
      if (consumed) continue

      // brick hits
      for (let bri = this.bricks.length - 1; bri >= 0; bri--) {
        const br  = this.bricks[bri]
        const hit = b.x >= br.x && b.x <= br.x + BRICK_W
                 && b.y >= br.y && b.y <= br.y + BRICK_H

        if (hit) {
          this.gameLayer.removeChild(b.view); b.view.destroy()
          this.bullets.splice(bi, 1)
          this.spawnPop(br.x + BRICK_W / 2, br.y + BRICK_H / 2, false)
          this.gameLayer.removeChild(br.view); br.view.destroy()
          this.bricks.splice(bri, 1)
          this.addScore(50)
          break
        }
      }
    }
  }

  private spawnPop(x: number, y: number, large: boolean) {
    const count = large ? 20 : 10
    for (let i = 0; i < count; i++) {
      const p   = new Graphics()
      const ang = (Math.PI * 2 * i) / count
      const dst = large ? 30 + Math.random() * 30 : 12 + Math.random() * 16
      p.circle(0, 0, large ? 4 : 2).fill({ color: 0xff6600 })
      p.position.set(x, y)
      this.popLayer.addChild(p)
      gsap.to(p, {
        x: x + Math.cos(ang) * dst,
        y: y + Math.sin(ang) * dst,
        alpha: 0,
        duration: large ? 0.4 : 0.25,
        ease: 'power2.out',
        onComplete: () => { this.popLayer.removeChild(p); p.destroy() },
      })
    }
  }

  private addScore(pts: number) {
    this.score += pts
    this.scoreText.text = `SCORE  ${this.score}`
    gsap.fromTo(this.scoreText, { pixi: { scaleX: 1.3, scaleY: 1.3 } }, { pixi: { scaleX: 1, scaleY: 1 }, duration: 0.2, ease: 'back.out' })
  }

  private showSplash(msg: string, onDone: () => void) {
    this.splashText.text  = msg
    this.splashText.alpha = 0
    gsap.to(this.splashText, {
      alpha: 1, duration: 0.3, ease: 'power2.out',
      onComplete: () => {
        gsap.to(this.splashText, {
          alpha: 0, duration: 0.4, delay: 1.2, ease: 'power2.in',
          onComplete: onDone,
        })
      },
    })
  }

  private spawnBricks(level: number) {
    const totalW  = BRICK_COLS * (BRICK_W + BRICK_GAP) - BRICK_GAP
    const totalH  = BRICK_ROWS * (BRICK_H + BRICK_GAP) - BRICK_GAP
    const originX = (W() - totalW) / 2
    const originY = (H() - totalH) / 2

    const BG   = 0xd4b08c
    const pad  = 18
    const road = 28
    const cr   = 24

    const ix = originX - pad,     iy = originY - pad
    const iw = totalW + pad * 2,  ih = totalH + pad * 2
    const ox = ix - road,         oy = iy - road
    const ow = iw + road * 2,     oh = ih + road * 2
    const ocr = cr + road

    const border = new Graphics()
    border.roundRect(ox + 6, oy + 9, ow, oh, ocr).fill({ color: 0x000000, alpha: 0.28 })
    border.roundRect(ox - 4, oy - 4, ow + 8, oh + 8, ocr + 4).fill({ color: 0x5c2810 })
    border.roundRect(ox, oy, ow, oh, ocr).fill({ color: 0xaf6b28 })
    border.roundRect(ox + 4, oy + 4, ow - 8, (oh - 8) * 0.4, ocr - 2).fill({ color: 0xce8f48, alpha: 0.65 })
    border.roundRect(ox + 4, oy + oh * 0.58, ow - 8, oh * 0.38, ocr - 2).fill({ color: 0x000000, alpha: 0.10 })
    border.roundRect(ix - 5, iy - 5, iw + 10, ih + 10, cr + 3).fill({ color: 0x5c2810, alpha: 0.45 })
    border.roundRect(ix, iy, iw, ih, cr).fill({ color: BG })

    this.gameLayer.addChild(border)
    this.brickBorder = border

    // 8-pointed starburst: blue centre, pink/purple outer arms
    const cx    = (BRICK_COLS - 1) / 2
    const cy    = (BRICK_ROWS - 1) / 2
    const halfW = (BRICK_COLS - 1) / 2
    const halfH = (BRICK_ROWS - 1) / 2

    const CENTER_COLORS = [0x40c8f4, 0x50d0ff, 0x3ab4e8]
    const MID_COLORS    = [0x3498db, 0x6050d8, 0x8050cc]
    const OUTER_COLORS  = [0xff69b4, 0xe040b0, 0xc838a8, 0x9b59b6]

    void level  // colour zones are distance-based; level reserved for future variation

    for (let row = 0; row < BRICK_ROWS; row++) {
      for (let col = 0; col < BRICK_COLS; col++) {
        const ndx  = (col - cx) / halfW
        const ndy  = (row - cy) / halfH
        const dist = Math.sqrt(ndx * ndx + ndy * ndy)
        if (dist > 1.02) continue

        const angle      = Math.atan2(ndy, ndx)
        const starFactor = Math.max(Math.abs(Math.cos(2 * angle)), Math.abs(Math.sin(2 * angle)))
        const threshold  = 0.38 + 0.64 * starFactor
        if (dist > threshold) continue

        const norm    = dist / Math.max(threshold, 0.001)
        const palette = norm < 0.38 ? CENTER_COLORS : norm < 0.72 ? MID_COLORS : OUTER_COLORS
        const color   = palette[Math.floor(Math.random() * palette.length)]

        const x = originX + col * (BRICK_W + BRICK_GAP)
        const y = originY + row * (BRICK_H + BRICK_GAP)
        const g = new Graphics()
        g.rect(0, 0, BRICK_W, BRICK_H).fill({ color })
        g.rect(0, 0, BRICK_W, 3).fill({ color: 0xffffff, alpha: 0.30 })
        g.position.set(x, y)
        this.gameLayer.addChild(g)
        this.bricks.push({ x, y, view: g })
      }
    }
  }

  private clearBricks() {
    for (const br of this.bricks) { this.gameLayer.removeChild(br.view); br.view.destroy() }
    this.bricks = []
    if (this.brickBorder) {
      this.gameLayer.removeChild(this.brickBorder)
      this.brickBorder.destroy()
      this.brickBorder = null
    }
  }

  private clearEnemies() {
    for (const e of this.enemies) { this.gameLayer.removeChild(e.view); e.view.destroy() }
    this.enemies = []
  }

  private clearBullets() {
    for (const b of this.bullets) { this.gameLayer.removeChild(b.view); b.view.destroy() }
    this.bullets = []
  }

  private async handleLevelComplete() {
    this.addScore(levelClearBonus(this.currentLevel))
    const next = await this.requestLevel(this.currentLevel + 1)
    if (next) {
      this.loadLevel(next)
    } else {
      this.onGameOver(this.score)
    }
  }
}