import { Room, Client } from 'colyseus'
import { BubbleShooterState } from '../schema/BubbleShooterState'

const ALL_COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange']
const QUEUE_TARGET = 20

export class BubbleShooterRoom extends Room<BubbleShooterState> {
  maxClients = 1

  onCreate() {
    this.setState(new BubbleShooterState())

    // Seed initial queue before any client fires a shot
    this.fill(ALL_COLORS, QUEUE_TARGET)

    this.onMessage('refill', (_client: Client, msg: { count: number; boardColors: string[] }) => {
      const pool = msg.boardColors?.length > 0 ? msg.boardColors : ALL_COLORS
      this.fill(pool, msg.count ?? 1)
    })
  }

  private fill(pool: string[], count: number) {
    for (let i = 0; i < count; i++) {
      this.state.colorQueue.push(pool[Math.floor(Math.random() * pool.length)])
    }
  }
}
