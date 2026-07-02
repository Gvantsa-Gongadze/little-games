import { Application, Container, Text } from 'pixi.js'
import { gsap } from 'gsap'
import {
  HUD_FONT, ACCENT, GRID_W,
  BLOCK_W, BLOCK_H, BLOCK_GAP, GRID_TOP_PAD,
  type LevelConfig,
} from '../constants'
import { Block } from '../entities/Block'

const FONT = `${HUD_FONT}, monospace`
const W    = () => window.innerWidth
const H    = () => window.innerHeight

export class ColourBlazeScene {
  view = new Container()

  // Layer order (back → front)
  private gameLayer = new Container()  // blocks
  private hudLayer  = new Container()  // score / level / splash

  // Entities
  private blocks: Block[] = []

  // Layout
  private wallLeft  = 0
  private wallRight = 0

  // HUD nodes
  private scoreText: Text
  private levelText: Text
  private splashText: Text

  constructor(_app: Application, _onGameOver: (score: number) => void) {
    this.view.label      = 'ColourBlazeScene'
    this.gameLayer.label = 'gameLayer'
    this.hudLayer.label  = 'hudLayer'

    this.view.addChild(this.gameLayer, this.hudLayer)

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

    // Clear any blocks from the previous level
    for (const block of this.blocks) block.view.destroy({ children: true })
    this.blocks = []

    // Build the block grid — centred horizontally, starting at GRID_TOP_PAD
    config.rows.forEach((row, r) => {
      row.forEach((cell, c) => {
        const x = this.wallLeft + c * (BLOCK_W + BLOCK_GAP)
        const y = GRID_TOP_PAD  + r * (BLOCK_H + BLOCK_GAP)
        const block = new Block(x, y, cell.hp, cell.color)
        this.blocks.push(block)
        this.gameLayer.addChild(block.view)
      })
    })

    this.showSplash(`LEVEL  ${config.level}`)
  }

  onResize() {
    const originX  = (W() - GRID_W) / 2
    this.wallLeft  = originX
    this.wallRight = originX + GRID_W

    this.scoreText.position.set(this.wallLeft + 2, 26)
    this.levelText.position.set(this.wallRight - 2, 26)
    this.splashText.position.set(W() / 2, H() / 2)
  }

  update(_delta: number) {}

  destroy() {
    gsap.killTweensOf(this.splashText)
    this.view.destroy({ children: true })
  }

  // ── helpers ──────────────────────────────────────────────────────────────────

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
