import { Room, Client } from 'colyseus'

const PALETTE = [0xee3333, 0x3366ee, 0x9933cc, 0x223355, 0xcccccc, 0xffcc22, 0x22bb55]
const COLS    = 7

function generateLevel(level: number) {
  const rowCount = Math.min(2 + Math.floor(level / 2), 8)
  const maxHp    = Math.ceil(level * 1.5)

  const rows = Array.from({ length: rowCount }, () =>
    Array.from({ length: COLS }, () => ({
      hp:    Math.max(1, Math.ceil(Math.random() * maxHp)),
      color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
    }))
  )

  return { level, rows }
}

export class BlazeShooterRoom extends Room {
  maxClients = 1

  onCreate() {
    this.onMessage('request_level', (client: Client, { level }: { level: number }) => {
      client.send('level_data', generateLevel(Math.max(1, level)))
    })
  }
}
