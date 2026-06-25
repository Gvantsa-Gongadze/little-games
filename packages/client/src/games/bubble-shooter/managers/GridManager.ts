import { Container } from 'pixi.js'
import { Bubble } from '../entities/Bubble'
import {
  BUBBLE_RADIUS, COL_SPACING, ROW_SPACING, COLS, COLOR_HEX,
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
    const offset = row % 2 === 1 ? BUBBLE_RADIUS : 0
    return {
      x: this.startX + col * COL_SPACING + offset,
      y: this.startY + row * ROW_SPACING,
    }
  }

  // Convert pixel position → nearest valid grid cell (clamped to grid bounds)
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
        this.grid[r][c] = { bubble: null }
        if (color) this.place(c, r, new Bubble(color))
      })
    })
  }

  // ─── Hex neighbour helpers ───────────────────────────────────────────────

  // Returns the up-to-6 valid adjacent cells for a hex offset grid.
  // Even rows are unshifted; odd rows are shifted right by BUBBLE_RADIUS.
  getHexNeighbors(col: number, row: number): { col: number; row: number }[] {
    const isOdd = row % 2 === 1
    const candidates = [
      { col: col - 1, row },                                   // left
      { col: col + 1, row },                                   // right
      { col: col + (isOdd ? 0 : -1), row: row - 1 },          // upper-left
      { col: col + (isOdd ? 1 :  0), row: row - 1 },          // upper-right
      { col: col + (isOdd ? 0 : -1), row: row + 1 },          // lower-left
      { col: col + (isOdd ? 1 :  0), row: row + 1 },          // lower-right
    ]
    return candidates.filter(n =>
      n.row >= 0 && n.col >= 0 && n.col < this.colsInRow(n.row)
    )
  }

  // ─── Snap ────────────────────────────────────────────────────────────────

  // Nearest empty grid cell to a pixel position (checks primary + 6 neighbours).
  // Treats uninitialised rows as empty so a bubble can land below the current grid.
  findSnapCell(px: number, py: number): { col: number; row: number } | null {
    const primary    = this.pixelToCell(px, py)
    const candidates = [primary, ...this.getHexNeighbors(primary.col, primary.row)]

    let best:     { col: number; row: number } | null = null
    let bestDist  = Infinity

    for (const c of candidates) {
      // Skip occupied cells
      const cell = this.grid[c.row]?.[c.col]
      if (cell && cell.bubble !== null) continue

      // Only snap to the ceiling row or to a cell adjacent to an existing bubble.
      // Without this, bubbles fired through empty columns float in mid-air.
      const attachedToCeiling  = c.row === 0
      const adjacentToOccupied = this.getHexNeighbors(c.col, c.row)
        .some(n => this.grid[n.row]?.[n.col]?.bubble)
      if (!attachedToCeiling && !adjacentToOccupied) continue

      const { x, y } = this.cellToPixel(c.col, c.row)
      const dist = Math.hypot(px - x, py - y)
      if (dist < bestDist) { bestDist = dist; best = c }
    }

    return best
  }

  // ─── BFS helpers ─────────────────────────────────────────────────────────

  // Flood-fill from (col, row) collecting all same-colour connected cells.
  // Special rules: stone is immune; rainbow is a wildcard that matches any colour;
  // bomb/lightning/colorBomb return [] because the scene handles those separately.
  findCluster(col: number, row: number): { col: number; row: number }[] {
    const startCell = this.getCell(col, row)
    if (!startCell?.bubble) return []

    const sb = startCell.bubble
    if (sb.special === 'stone') return []
    if (sb.special === 'bomb' || sb.special === 'lightning' || sb.special === 'colorBomb') return []

    // Rainbow: inherit colour from the first non-special neighbour found
    let targetColor = sb.color
    if (sb.special === 'rainbow') {
      const coloredNeighbor = this.getHexNeighbors(col, row).find(n => {
        const b = this.getCell(n.col, n.row)?.bubble
        return b && !b.special
      })
      if (!coloredNeighbor) return []
      targetColor = this.getCell(coloredNeighbor.col, coloredNeighbor.row)!.bubble!.color
    }

    const visited = new Set<string>()
    const queue   = [{ col, row }]
    const cluster: { col: number; row: number }[] = []

    while (queue.length > 0) {
      const cur = queue.shift()!
      const key = `${cur.col},${cur.row}`
      if (visited.has(key)) continue
      visited.add(key)

      const cell = this.getCell(cur.col, cur.row)
      if (!cell?.bubble) continue
      const b = cell.bubble
      if (b.special === 'stone') continue
      const matches = b.special === 'rainbow' || b.color === targetColor
      if (!matches) continue

      cluster.push(cur)
      for (const n of this.getHexNeighbors(cur.col, cur.row)) {
        if (!visited.has(`${n.col},${n.row}`)) queue.push(n)
      }
    }

    return cluster
  }

  // BFS from every bubble in row 0; returns all occupied cells NOT reachable
  // from the top (i.e. floating after a pop).
  findFloating(): { col: number; row: number }[] {
    const visited = new Set<string>()
    const queue: { col: number; row: number }[] = []

    for (let c = 0; c < this.colsInRow(0); c++) {
      if (this.grid[0]?.[c]?.bubble) queue.push({ col: c, row: 0 })
    }

    while (queue.length > 0) {
      const cur = queue.shift()!
      const key = `${cur.col},${cur.row}`
      if (visited.has(key)) continue
      visited.add(key)

      for (const n of this.getHexNeighbors(cur.col, cur.row)) {
        const nKey = `${n.col},${n.row}`
        if (!visited.has(nKey) && this.grid[n.row]?.[n.col]?.bubble) queue.push(n)
      }
    }

    const floating: { col: number; row: number }[] = []
    for (let r = 0; r < this.grid.length; r++) {
      if (!this.grid[r]) continue
      for (let c = 0; c < this.grid[r].length; c++) {
        if (this.grid[r][c]?.bubble && !visited.has(`${c},${r}`)) {
          floating.push({ col: c, row: r })
        }
      }
    }
    return floating
  }

  // ─── Mutation ────────────────────────────────────────────────────────────

  removeBubble(col: number, row: number) {
    const cell = this.grid[row]?.[col]
    if (!cell?.bubble) return
    this.container.removeChild(cell.bubble.view)
    cell.bubble.view.destroy()
    cell.bubble = null
  }

  // Removes the bubble from grid state and the grid container but keeps the
  // Bubble object alive so the caller can animate it before destroying.
  extractBubble(col: number, row: number): Bubble | null {
    const cell = this.grid[row]?.[col]
    if (!cell?.bubble) return null
    const bubble = cell.bubble
    cell.bubble = null
    this.container.removeChild(bubble.view)
    return bubble
  }

  getBoardColors(): BubbleColor[] {
    const colors = new Set<BubbleColor>()
    for (const row of this.grid) {
      if (!row) continue
      for (const cell of row) {
        if (cell?.bubble) colors.add(cell.bubble.color)
      }
    }
    if (colors.size === 0) return Object.keys(COLOR_HEX) as BubbleColor[]
    return [...colors]
  }

  hasBubbleBelowY(thresholdY: number): boolean {
    for (let r = 0; r < this.grid.length; r++) {
      if (!this.grid[r]) continue
      for (let c = 0; c < this.grid[r].length; c++) {
        if (this.grid[r][c]?.bubble && this.cellToPixel(c, r).y >= thresholdY) return true
      }
    }
    return false
  }

  isEmpty(): boolean {
    for (const row of this.grid) {
      if (!row) continue
      for (const cell of row) {
        if (cell?.bubble) return false
      }
    }
    return true
  }

  // All occupied non-stone cells within `rings` hex steps of (col, row).
  getBombTargets(col: number, row: number, rings: number): { col: number; row: number }[] {
    const visited = new Set<string>()
    const queue: { col: number; row: number; dist: number }[] = [{ col, row, dist: 0 }]
    const result: { col: number; row: number }[] = []

    while (queue.length > 0) {
      const cur = queue.shift()!
      const key = `${cur.col},${cur.row}`
      if (visited.has(key)) continue
      visited.add(key)

      const b = this.grid[cur.row]?.[cur.col]?.bubble
      if (b && b.special !== 'stone') result.push({ col: cur.col, row: cur.row })

      if (cur.dist < rings) {
        for (const n of this.getHexNeighbors(cur.col, cur.row)) {
          if (!visited.has(`${n.col},${n.row}`)) queue.push({ ...n, dist: cur.dist + 1 })
        }
      }
    }

    return result
  }

  // All occupied non-stone cells in the given row.
  getCellsInRow(row: number): { col: number; row: number }[] {
    if (!this.grid[row]) return []
    const result: { col: number; row: number }[] = []
    for (let c = 0; c < this.grid[row].length; c++) {
      const b = this.grid[row][c]?.bubble
      if (b && b.special !== 'stone') result.push({ col: c, row })
    }
    return result
  }

  // All occupied non-stone cells whose colour matches the given BubbleColor.
  getCellsOfColor(color: BubbleColor): { col: number; row: number }[] {
    const result: { col: number; row: number }[] = []
    for (let r = 0; r < this.grid.length; r++) {
      if (!this.grid[r]) continue
      for (let c = 0; c < this.grid[r].length; c++) {
        const b = this.grid[r][c]?.bubble
        if (b && b.color === color && b.special !== 'stone') result.push({ col: c, row: r })
      }
    }
    return result
  }
}
