import { Room, Client } from 'colyseus'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const FALLBACK_LEVELS = [
  { level: 1, enemy_count:  6, enemy_speed: 1.2, enemy_hp:  1, boss: false, pattern: 'grid'  },
  { level: 2, enemy_count:  8, enemy_speed: 1.4, enemy_hp:  1, boss: false, pattern: 'wave'  },
  { level: 3, enemy_count: 10, enemy_speed: 1.6, enemy_hp:  2, boss: false, pattern: 'swarm' },
  { level: 4, enemy_count: 12, enemy_speed: 1.8, enemy_hp:  2, boss: false, pattern: 'grid'  },
  { level: 5, enemy_count:  4, enemy_speed: 2.0, enemy_hp:  8, boss: true,  pattern: 'swarm' },
  { level: 6, enemy_count: 14, enemy_speed: 2.0, enemy_hp:  3, boss: false, pattern: 'wave'  },
  { level: 7, enemy_count: 16, enemy_speed: 2.2, enemy_hp:  3, boss: false, pattern: 'swarm' },
  { level: 8, enemy_count:  4, enemy_speed: 2.5, enemy_hp: 15, boss: true,  pattern: 'grid'  },
]

async function fetchLevel(level: number) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null
  try {
    const url = `${SUPABASE_URL}/rest/v1/blaze_levels?level=eq.${level}&select=*&limit=1`
    const res  = await fetch(url, {
      headers: {
        'apikey':        SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
    })
    if (!res.ok) return null
    const rows = await res.json() as unknown[]
    return (rows[0] as object) ?? null
  } catch {
    return null
  }
}

export class BlazeShooterRoom extends Room {
  maxClients = 1

  onCreate() {
    this.onMessage('request_level', async (client: Client, { level }: { level: number }) => {
      const dbData = await fetchLevel(level)
      const data   = dbData ?? FALLBACK_LEVELS.find(l => l.level === level) ?? null
      client.send('level_data', data)
    })
  }
}