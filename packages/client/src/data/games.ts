export interface GameMeta {
  id: string
  title: string
  description: string
  route: string
  tag: '2D' | '3D'
  accent: string
  emoji: string
}

export const GAMES: GameMeta[] = [
  {
    id: '2d-game',
    title: '2D Arena',
    description: 'Move your square, survive the chaos.',
    route: '/game',
    tag: '2D',
    accent: '#00ff99',
    emoji: '🟩',
  },
  {
    id: '3d-cube',
    title: '3D Cube',
    description: 'Spin and orbit a glowing cube.',
    route: '/game3d',
    tag: '3D',
    accent: '#a78bfa',
    emoji: '🟪',
  },
]
