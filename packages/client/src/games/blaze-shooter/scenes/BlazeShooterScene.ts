import { Application, Container, Graphics, Text } from 'pixi.js'
import { gsap } from 'gsap'
import {
  HUD_FONT, ACCENT,
  GRID_W, GRID_TOP_PAD, LAUNCHER_PAD,
  WOOD_DARK, WOOD_MID, WOOD_LIGHT,
  type LevelConfig,
} from '../constants'

const FONT = `${HUD_FONT}, monospace`
const W    = () => window.innerWidth
const H    = () => window.innerHeight

export class BlazeShooterScene {
  view = new Container()

  // Layer order (back → front)
  private bgLayer  = new Container()   // wooden frame + picture panel
  private hudLayer = new Container()   // score / level / splash

  // Background sub-graphics
  private frameG   = new Graphics()
  private pictureG = new Graphics()

  // Layout
  private launcherY = 0
  private wallLeft  = 0
  private wallRight = 0

  // HUD nodes
  private scoreText: Text
  private levelText: Text
  private splashText: Text

  constructor(_app: Application, _onGameOver: (score: number) => void) {
    this.view.label     = 'BlazeShooterScene'
    this.bgLayer.label  = 'bgLayer'
    this.hudLayer.label = 'hudLayer'
    this.frameG.label   = 'frameGraphics'
    this.pictureG.label = 'roadGraphics'

    this.bgLayer.addChild(this.frameG, this.pictureG)

    this.view.addChild(
      this.bgLayer,
      this.hudLayer,
    )

    this.scoreText = new Text({
      text: '0',
      style: { fontFamily: FONT, fontSize: 13, fill: '#ffffff' },
    })
    this.scoreText.label = 'scoreText'

    this.levelText = new Text({
      text: 'LV 1',
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

    this.hudLayer.addChild(this.scoreText, this.levelText, this.splashText)

    this.onResize()
  }

  // ── public API ──────────────────────────────────────────────────────────────

  loadLevel(config: LevelConfig) {
    this.levelText.text = `LV ${config.level}`
    this.onResize()
    this.showSplash(`LEVEL  ${config.level}`, () => {})
  }

  onResize() {
    this.launcherY = H() - LAUNCHER_PAD

    const originX  = (W() - GRID_W) / 2
    this.wallLeft  = originX
    this.wallRight = originX + GRID_W

    this.scoreText.position.set(this.wallLeft + 2, 26)
    this.levelText.position.set(this.wallRight - 2, 26)
    this.splashText.position.set(W() / 2, H() / 2)

    this.drawFrame()
    this.drawPicture()
  }

  update(_delta: number) {}

  destroy() {
    gsap.killTweensOf(this.splashText)
    this.view.destroy({ children: true })
  }

  // ── wooden frame ─────────────────────────────────────────────────────────────

  private drawFrame() {
    const g  = this.frameG
    const fx = this.wallLeft  - 16
    const fw = GRID_W + 32
    const fy = 12
    const fh = this.launcherY + 36 - fy
    const r  = 22
    g.clear()

    g.roundRect(fx + 5, fy + 7, fw, fh, r).fill({ color: 0x000000, alpha: 0.28 })
    g.roundRect(fx, fy, fw, fh, r).fill({ color: WOOD_MID })

    for (let i = 0; i < 12; i++) {
      const gy = fy + 18 + i * (fh / 12)
      g.rect(fx + 8, gy, fw - 16, 1.5)
       .fill({ color: 0xffffff, alpha: 0.04 + (i % 2) * 0.04 })
    }

    g.roundRect(fx + 10, fy + 10, fw - 20, fh - 20, r - 5)
      .stroke({ color: WOOD_DARK, width: 3, alpha: 0.7 })
    g.roundRect(fx + 13, fy + 13, fw - 26, fh - 26, r - 8)
      .stroke({ color: WOOD_LIGHT, width: 1, alpha: 0.4 })
    g.roundRect(fx + 14, fy + 14, fw - 28, fh - 28, r - 8)
      .fill({ color: 0xd4a870, alpha: 0.28 })
  }

  // ── 10×10 brick mosaic — centred in the play area ───────────────────────────

  private drawPicture() {
    const g    = this.pictureG
    const COLS = 10
    const ROWS = 10
    const BS   = 18
    const GAP  = 2
    const STEP = BS + GAP
    const TOT  = COLS * STEP - GAP

    const cx = this.wallLeft + GRID_W / 2
    const cy = (GRID_TOP_PAD + this.launcherY) / 2
    const ox = Math.round(cx - TOT / 2)
    const oy = Math.round(cy - TOT / 2)

    const COLORS = [
      0x3366ee,
      0xff44aa,
      0x22bb55,
      0xffcc22,
    ]

    g.clear()

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const color = COLORS[(r + c) % 4]
        const bx    = ox + c * STEP
        const by    = oy + r * STEP

        g.roundRect(bx + 1, by + 2, BS, BS, 3).fill({ color: 0x000000, alpha: 0.28 })
        g.roundRect(bx, by, BS, BS, 3).fill({ color })
        g.roundRect(bx + 2, by + 2, BS - 4, Math.round(BS * 0.36), 2)
          .fill({ color: 0xffffff, alpha: 0.24 })
        g.roundRect(bx + 2, by + Math.round(BS * 0.66), BS - 4, Math.round(BS * 0.2), 1)
          .fill({ color: 0x000000, alpha: 0.14 })
      }
    }
  }

  // ── helpers ──────────────────────────────────────────────────────────────────

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
