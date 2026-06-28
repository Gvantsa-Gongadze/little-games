import { Application, Container, Graphics, Text } from 'pixi.js'
import { gsap } from 'gsap'
import {
  HUD_FONT,
  BRICK_W, BRICK_H, BRICK_GAP, BRICK_COLS, BRICK_ROWS,
  levelClearBonus,
  type LevelConfig,
} from '../constants'

const FONT = `${HUD_FONT}, monospace`

const W = () => window.innerWidth
const H = () => window.innerHeight

// ── tiny entity types ────────────────────────────────────────────────────────

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

  private gameLayer    = new Container()
  private hudLayer     = new Container()

  private bricks:  Brick[]  = []
  private brickBorder: Graphics | null = null

  private scoreText: Text
  private levelText: Text
  private splashText: Text

  private requestLevel: (n: number) => Promise<LevelConfig | null>
  private onGameOver:   (score: number) => void

  constructor(
    _app: Application,
    requestLevel: (n: number) => Promise<LevelConfig | null>,
    onGameOver: (score: number) => void,
  ) {
    this.requestLevel = requestLevel
    this.onGameOver   = onGameOver
    this.view.addChild(this.gameLayer, this.hudLayer)

    // HUD
    this.scoreText = new Text({ text: 'SCORE  0', style: { fontFamily: FONT, fontSize: 12, fill: '#ffffff' } })
    this.scoreText.position.set(14, 14)

    this.levelText = new Text({ text: '', style: { fontFamily: FONT, fontSize: 12, fill: 0xff6600 } })
    this.levelText.anchor.set(1, 0)

    this.splashText = new Text({ text: '', style: { fontFamily: FONT, fontSize: 28, fill: 0xff6600 } })
    this.splashText.anchor.set(0.5)
    this.splashText.alpha = 0

    this.hudLayer.addChild(this.scoreText, this.levelText, this.splashText)

    this.onResize()
  }

  // ── public API ──────────────────────────────────────────────────────────────

  loadLevel(config: LevelConfig) {
    this.currentLevel = config.level
    this.spawning     = true
    this.done         = false

    this.levelText.text = `LEVEL  ${config.level}`
    this.onResize()

    this.clearBricks()
    this.spawnBricks(config.level)

    this.showSplash(`LEVEL  ${config.level}`, () => {
      this.spawning = false
    })
  }

  onResize() {
    this.levelText.position.set(W() - 14, 14)
    this.splashText.position.set(W() / 2, H() / 2)
  }

  update(_delta: number) {
    if (this.done) return

    if (this.bricks.length === 0 && !this.spawning && !this.done) {
      this.done = true
      this.handleLevelComplete()
    }
  }

  destroy() {
    gsap.killTweensOf(this.splashText)
    this.view.destroy({ children: true })
  }

  // ── private ─────────────────────────────────────────────────────────────────

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