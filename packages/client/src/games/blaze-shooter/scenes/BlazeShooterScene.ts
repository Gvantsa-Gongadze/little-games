import { Application, Container, Graphics, Text } from 'pixi.js'
import { gsap } from 'gsap'
import {
  HUD_FONT, ACCENT,
  GRID_W, LAUNCHER_PAD,
  WOOD_DARK, WOOD_MID, WOOD_LIGHT,
  type LevelConfig,
} from '../constants'

const FONT = `${HUD_FONT}, monospace`
const W    = () => window.innerWidth
const H    = () => window.innerHeight

function dashedPath(
  g: Graphics,
  pts: [number, number][],
  dashLen: number,
  gapLen: number,
  color: number,
  lineWidth: number,
) {
  let dashRemain = dashLen
  let drawing    = true
  for (let i = 1; i < pts.length; i++) {
    const [x1, y1] = pts[i - 1]
    const [x2, y2] = pts[i]
    const segLen = Math.hypot(x2 - x1, y2 - y1)
    if (segLen === 0) continue
    const dx = (x2 - x1) / segLen
    const dy = (y2 - y1) / segLen
    let t = 0
    while (t < segLen) {
      const step = Math.min(dashRemain, segLen - t)
      if (drawing) {
        g.moveTo(x1 + dx * t,          y1 + dy * t)
         .lineTo(x1 + dx * (t + step), y1 + dy * (t + step))
         .stroke({ color, width: lineWidth, cap: 'round' })
      }
      t          += step
      dashRemain -= step
      if (dashRemain <= 0) {
        drawing    = !drawing
        dashRemain = drawing ? dashLen : gapLen
      }
    }
  }
}

function roundRectPerimeter(
  x: number, y: number, w: number, h: number, r: number, steps = 10,
): [number, number][] {
  const pts: [number, number][] = []
  const corners: [number, number, number, number][] = [
    [x + r,     y + r,     -Math.PI,      -Math.PI / 2],
    [x + w - r, y + r,     -Math.PI / 2,  0           ],
    [x + w - r, y + h - r,  0,             Math.PI / 2],
    [x + r,     y + h - r,  Math.PI / 2,  Math.PI    ],
  ]
  for (const [cx, cy, a0, a1] of corners) {
    for (let i = 0; i <= steps; i++) {
      const a = a0 + (a1 - a0) * (i / steps)
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
    }
  }
  pts.push(pts[0])
  return pts
}

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

  // ── 10×10 brick mosaic with road circuit ────────────────────────────────────

  private drawPicture() {
    const g    = this.pictureG
    const COLS = 10
    const ROWS = 10
    const BS   = 18
    const GAP  = 2
    const STEP = BS + GAP
    const TOT  = COLS * STEP - GAP   // 198 px

    const midX = this.wallLeft + GRID_W / 2
    const ox   = Math.round(midX - TOT / 2)
    // Top of mosaic = 30 % down from the frame's inner background edge
    // (frame inner top = fy(12) + 14 = 26; inner height = launcherY + 24 - 28 = launcherY - 4)
    const oy   = Math.round(26 + 0.20 * (this.launcherY - 4))

    g.clear()

    // ── Road circuit around the mosaic ───────────────────────────────────────
    const pad   = 14     // px gap between mosaic edge and inner road edge
    const roadW = 40     // px road width
    const r_c   = 28     // corner radius for the road center path

    const rcx = ox - pad - roadW / 2
    const rcy = oy - pad - roadW / 2
    const rcw = TOT + 2 * (pad + roadW / 2)
    const rch = TOT + 2 * (pad + roadW / 2)

    // Dark asphalt — thick stroke centered on the road-center path
    g.roundRect(rcx, rcy, rcw, rch, r_c)
     .stroke({ color: 0x1e1e1e, width: roadW })

    // White outer edge line
    const r_out = r_c + roadW / 2
    g.roundRect(rcx - roadW / 2, rcy - roadW / 2, rcw + roadW, rch + roadW, r_out)
     .stroke({ color: 0xffffff, width: 2.5, join: 'round', cap: 'round' })

    // White inner edge line
    const r_in = Math.max(4, r_c - roadW / 2)
    g.roundRect(rcx + roadW / 2, rcy + roadW / 2, rcw - roadW, rch - roadW, r_in)
     .stroke({ color: 0xffffff, width: 2.5, join: 'round', cap: 'round' })

    // White dashed center line
    const ctrPts = roundRectPerimeter(rcx, rcy, rcw, rch, r_c)
    dashedPath(g, ctrPts, 14, 8, 0xffffff, 2)

    // ── Brick mosaic (drawn on top so it sits inside the road ring) ──────────
    const COLORS = [0x3366ee, 0xff44aa, 0x22bb55, 0xffcc22]
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

    // ── 5 squares below the road ──────────────────────────────────────────────
    // Five sharp-cornered squares, all warm-dark brown.
    const SQ       = 57
    const SQ_GAP   = 16
    const sqTotalW = 5 * SQ + 4 * SQ_GAP
    const sqStartX = Math.round(midX - sqTotalW / 2)
    const roadBotY = rcy + rch + roadW / 2   // outer bottom edge of the road ring
    const sqY      = Math.round(roadBotY + 50)

    for (let i = 0; i < 5; i++) {
      const sx = sqStartX + i * (SQ + SQ_GAP)
      g.rect(sx + 2, sqY + 3, SQ, SQ).fill({ color: 0x000000, alpha: 0.3 })
      g.rect(sx, sqY, SQ, SQ).fill({ color: 0x7a4418 })
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
