import { Container } from 'pixi.js'
import { Bubble } from '../entities/Bubble'
import {
  BUBBLE_RADIUS, COL_SPACING, ROW_SPACING, COLS,
  type BubbleColor,
} from '../constants'

export type GridCell = { bubble: Bubble | null }

export class GridManager {
  private grid:      GridCell[][]   = []
  readonly container = new Container()

  private startX: number
  private startY: number

  constructor(startX: number, startY: number) {
    this.startX = startX
    this.startY = startY
  }

  // Odd rows are offset by half a bubble, so they hold one fewer column
  colsInRow(row: number): number {
    return row % 2 === 0 ? COLS : COLS - 1
  }

  // Convert grid coordinates → pixel centre
  cellToPixel(col: number, row: number): { x: number; y: number } {
    const offset = row % 2 === 1 ? BUBBLE_RADIUS : 0   // half-cell shift on odd rows
    return {
      x: this.startX + col * COL_SPACING + offset,
      y: this.startY + row * ROW_SPACING,
    }
  }

  // Convert pixel position → nearest valid grid cell
  pixelToCell(px: number, py: number): { col: number; row: number } {
    const row = Math.round((py - this.startY) / ROW_SPACING)
    const r   = Math.max(0, row)
    const offset = r % 2 === 1 ? BUBBLE_RADIUS : 0
    const col = Math.round((px - this.startX - offset) / COL_SPACING)
    return { col: Math.max(0, Math.min(col, this.colsInRow(r) - 1)), row: r }
  }

  getCell(col: number, row: number): GridCell | null {
    return this.grid[row]?.[col] ?? null
  }

  place(col: number, row: number, bubble: Bubble) {
    if (!this.grid[row]) this.grid[row] = []
    this.grid[row][col] = { bubble }

    const { x, y } = this.cellToPixel(col, row)
    bubble.view.x = x
    bubble.view.y = y
    this.container.addChild(bubble.view)
  }

  // Fill the grid from a level layout array
  populate(layout: (BubbleColor | null)[][]) {
    layout.forEach((rowData, r) => {
      if (!this.grid[r]) this.grid[r] = []
      rowData.forEach((color, c) => {
        this.grid[r][c] = { bubble: null }   // initialise all cells
        if (color) this.place(c, r, new Bubble(color))
      })
    })
  }
}