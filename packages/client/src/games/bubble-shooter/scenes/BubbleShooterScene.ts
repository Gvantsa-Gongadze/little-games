import { Application, Container, Graphics } from 'pixi.js'
import type { Scene } from '@/engine/SceneManager'
import { GridManager } from '../managers/GridManager'
import { BUBBLE_RADIUS, COL_SPACING, COLS, GRID_TOP_PAD } from '../constants'
import { LEVEL_1 } from '../data/levels'

export class BubbleShooterScene implements Scene {
  view  = new Container()
  private grid: GridManager

  constructor(app: Application) {
    const W = app.screen.width

    // Centre the grid: total even-row width = COLS * COL_SPACING, then shift left by half
    const gridPixelWidth = COLS * COL_SPACING
    const startX = (W - gridPixelWidth) / 2 + BUBBLE_RADIUS

    this.grid = new GridManager(startX, GRID_TOP_PAD)
    this.grid.populate(LEVEL_1)

    // Draw a faint background grid (optional — helps during development)
    this.view.addChild(this.buildDebugGrid(startX, app.screen.height))

    this.view.addChild(this.grid.container)
  }

  // Dotted background grid for visual debugging — remove later
  private buildDebugGrid(startX: number, screenH: number): Container {
    const c = new Container()
    const g = new Graphics()
    for (let r = 0; r < 20; r++) {
      const cols = r % 2 === 0 ? COLS : COLS - 1
      const offset = r % 2 === 1 ? BUBBLE_RADIUS : 0
      for (let col = 0; col < cols; col++) {
        const x = startX + col * COL_SPACING + offset
        const y = GRID_TOP_PAD + r * (BUBBLE_RADIUS * Math.sqrt(3))
        if (y > screenH) break
        g.circle(x, y, 2).fill({ color: 0xffffff, alpha: 0.08 })
      }
    }
    c.addChild(g)
    return c
  }

  update(_delta: number) {}

  destroy() {
    this.view.destroy({ children: true })
  }
}