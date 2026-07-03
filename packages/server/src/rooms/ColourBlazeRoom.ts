import { Room, Client } from 'colyseus'

const BLOCK_COLORS  = [0xff3333, 0xff8800, 0xffcc00, 0x33cc66, 0x33aaff, 0xaa44ff, 0xff44aa]
const COLS          = 7
const ROW_FILL_RATE = 0.7   // chance each cell gets a block; null = gap (min 1 block per row)

function generateLevel(level: number) {
  const rowCount = Math.min(2 + Math.floor(level / 2), 8)
  const maxHp    = Math.ceil(level * 1.5)

  const makeCell = () => ({
    hp:    1 + Math.floor(Math.random() * maxHp),
    color: BLOCK_COLORS[Math.floor(Math.random() * BLOCK_COLORS.length)],
  })

  const rows = Array.from({ length: rowCount }, () => {
    const row = Array.from({ length: COLS }, () =>
      Math.random() < ROW_FILL_RATE ? makeCell() : null
    )
    if (!row.some(Boolean)) row[Math.floor(Math.random() * COLS)] = makeCell()
    return row
  })

  return { level, rows }
}

export class ColourBlazeRoom extends Room {
  maxClients = 1

  onCreate() {
    this.onMessage('request_level', (client: Client, msg: { level: number }) => {
      client.send('level_data', generateLevel(msg.level ?? 1))
    })
  }
}
