import { Room, Client } from 'colyseus'

const ALL_COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange']

export class BubbleShooterRoom extends Room {
  maxClients = 1

  onCreate() {
    this.onMessage('request_colors', (client: Client, msg: { count: number; boardColors: string[] }) => {
      const pool = msg.boardColors?.length > 0 ? msg.boardColors : ALL_COLORS
      const colors = Array.from({ length: msg.count ?? 1 }, () =>
        pool[Math.floor(Math.random() * pool.length)]
      )
      client.send('colors', colors)
    })
  }
}
