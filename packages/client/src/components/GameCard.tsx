import { useNavigate } from 'react-router-dom'
import type { GameMeta } from '@/data/games'

export default function GameCard({ game }: { game: GameMeta }) {
  const navigate = useNavigate()

  return (
    <div style={card}>
      <div style={{ ...preview, background: game.accent + '18', borderBottom: `1px solid ${game.accent}33` }}>
        <span style={{ fontSize: 64 }}>{game.emoji}</span>
        <span style={{ ...tag, background: game.accent + '22', color: game.accent, border: `1px solid ${game.accent}44` }}>
          {game.tag}
        </span>
      </div>
      <div style={body}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 4 }}>{game.title}</h2>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>{game.description}</p>
        <button
          onClick={() => navigate(game.route)}
          style={{ ...playBtn, background: game.accent, boxShadow: `0 0 12px ${game.accent}55` }}
        >
          Play
        </button>
      </div>
    </div>
  )
}

const card: React.CSSProperties = {
  width: 220,
  borderRadius: 12,
  border: '1px solid #222',
  background: '#111',
  overflow: 'hidden',
  transition: 'transform 0.15s, border-color 0.15s',
}

const preview: React.CSSProperties = {
  height: 130,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
}

const tag: React.CSSProperties = {
  position: 'absolute',
  top: 10,
  right: 10,
  fontSize: 11,
  fontWeight: 700,
  padding: '2px 8px',
  borderRadius: 4,
  letterSpacing: '0.05em',
}

const body: React.CSSProperties = {
  padding: '14px 16px 16px',
}

const playBtn: React.CSSProperties = {
  width: '100%',
  padding: '9px 0',
  border: 'none',
  borderRadius: 7,
  fontWeight: 700,
  fontSize: 14,
  color: '#000',
  cursor: 'pointer',
}
