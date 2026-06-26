import { Room, Client } from 'colyseus'
import { GameState, Player } from '../schema/GameState'

export class GameRoom extends Room<GameState> {
  maxClients = 4

  onCreate() {
    this.setState(new GameState())

    this.onMessage('move', (client, data: { x: number; y: number }) => {
      const player = this.state.players.get(client.sessionId)
      if (player) {
        player.x = data.x
        player.y = data.y
      }
    })
  }

  onJoin(client: Client, options: { name?: string }) {
    const player = new Player()
    player.name = options?.name ?? `Player ${this.clients.length}`
    this.state.players.set(client.sessionId, player)
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId)
  }
}
