export interface PlayerState {
  x: number
  y: number
  name: string
}

export interface IGameState {
  players: Record<string, PlayerState>
}
