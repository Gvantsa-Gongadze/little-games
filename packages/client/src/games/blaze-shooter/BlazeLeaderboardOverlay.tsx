import { useEffect } from 'react'

interface Props {
  score:     number
  onRestart: () => void
}

const ACCENT = '#ff6600'
const FONT   = '"Press Start 2P", monospace'

export default function BlazeLeaderboardOverlay({ score, onRestart }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.code === 'KeyR') onRestart() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onRestart])

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(13,13,26,0.92)',
      fontFamily: FONT,
      zIndex: 100,
    }}>
      <div style={{ fontSize: 28, color: ACCENT, marginBottom: 24, letterSpacing: 2 }}>
        GAME OVER
      </div>

      <div style={{ fontSize: 13, color: '#ffffff', marginBottom: 40 }}>
        SCORE &nbsp; {score}
      </div>

      <button
        onClick={onRestart}
        style={{
          fontFamily: FONT, fontSize: 12,
          background: ACCENT, color: '#ffffff',
          border: 'none', borderRadius: 6,
          padding: '12px 28px', cursor: 'pointer',
          letterSpacing: 1,
        }}
      >
        PLAY AGAIN
      </button>

      <div style={{ fontSize: 9, color: '#666', marginTop: 16 }}>
        OR PRESS R
      </div>
    </div>
  )
}
