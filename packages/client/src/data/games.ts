export interface GameMeta {
  id: string
  title: string
  description: string
  route: string
  tag: '2D' | '3D' | 'ARCADE' | 'CLASSIC'
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
  {
    id: 'bubble-shooter',
    title: 'Bubble Shooter',
    description: 'Pop bubbles, clear the board.',
    route: '/bubble-shooter',
    tag: 'ARCADE',
    accent: '#ff6eb4',
    emoji: '🫧',
  },
  {
    id: 'asteroids',
    title: 'Asteroids',
    description: 'Shoot rocks, survive the waves.',
    route: '/asteroids',
    tag: '2D',
    accent: '#facc15',
    emoji: '🪨',
  },
  {
    id: 'blaze-shooter',
    title: 'Blaze Shooter',
    description: 'Burn everything. Level up. Survive.',
    route: '/blaze-shooter',
    tag: 'ARCADE',
    accent: '#ff6600',
    emoji: '🔥',
  },
]
