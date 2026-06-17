import { Client, Room } from 'colyseus.js'

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'ws://localhost:2567'

let client: Client | null = null

export function getClient(): Client {
  if (!client) client = new Client(SERVER_URL)
  return client
}

export async function joinGameRoom(name: string): Promise<Room> {
  return getClient().joinOrCreate('game_room', { name })
}
