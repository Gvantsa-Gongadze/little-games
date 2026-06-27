import { useEffect, useState } from 'react'
import { supabase }       from '@/lib/supabase'
import { getLeaderboard } from '@/lib/scores'

type Entry = { score: number; user_id: string; username: string | null; created_at: string }

interface Props {
  score:     number
  onRestart: () => void
}

const ORANGE = '#ff6600'
const DIM    = '#4a2a0a'
const YELLOW = '#ffdd00'
const FONT   = '"Press Start 2P", cursive'

export default function BlazeLeaderboardOverlay({ score, onRestart }: Props) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [userId,  setUserId]  = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
    getLeaderboard('blaze-shooter', 10)
      .then(data => { setEntries(data ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.code === 'KeyR') onRestart() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onRestart])

  const displayName = (e: Entry) => e.username || '???'

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 10,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.82)',
      fontFamily: FONT,
    }}>
      <div style={{
        width: 380, padding: '32px 36px',
        border: `2px solid ${ORANGE}`,
        boxShadow: `0 0 24px ${ORANGE}44, inset 0 0 40px rgba(0,0,0,0.6)`,
        background: '#0a0400',
        color: ORANGE,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 20, letterSpacing: 4, marginBottom: 6 }}>
          GAME  OVER
        </div>

        <div style={{ fontSize: 11, letterSpacing: 3, color: YELLOW, marginBottom: 24 }}>
          SCORE &nbsp; {String(score).padStart(6, '0')}
        </div>

        <div style={{ borderTop: `1px solid ${DIM}`, marginBottom: 18 }} />

        <div style={{ fontSize: 9, letterSpacing: 4, marginBottom: 14, color: DIM }}>
          TOP 10
        </div>

        {loading ? (
          <div style={{ fontSize: 9, color: DIM, letterSpacing: 2, marginBottom: 24 }}>
            LOADING...
          </div>
        ) : entries.length === 0 ? (
          <div style={{ fontSize: 9, color: DIM, letterSpacing: 2, marginBottom: 24 }}>
            NO SCORES YET
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
            <tbody>
              {entries.map((e, i) => {
                const isYou = e.user_id === userId
                return (
                  <tr key={i} style={{ color: isYou ? YELLOW : ORANGE }}>
                    <td style={{ fontSize: 9, padding: '4px 0', textAlign: 'right', width: 28, opacity: 0.5 }}>
                      {`#${i + 1}`}
                    </td>
                    <td style={{ fontSize: 11, padding: '4px 8px', textAlign: 'right' }}>
                      {String(e.score).padStart(6, '0')}
                    </td>
                    <td style={{ fontSize: 8, padding: '4px 0 4px 8px', textAlign: 'left' }}>
                      {displayName(e)}{isYou ? ' ◄' : ''}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        <div style={{ borderTop: `1px solid ${DIM}`, marginBottom: 20 }} />

        <button
          onClick={onRestart}
          style={{
            fontFamily: FONT,
            fontSize: 11,
            letterSpacing: 3,
            padding: '10px 24px',
            background: 'transparent',
            border: `1px solid ${ORANGE}`,
            color: ORANGE,
            cursor: 'pointer',
            boxShadow: `0 0 10px ${ORANGE}44`,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#1a0a00')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          PLAY AGAIN
        </button>

        <div style={{ fontSize: 8, color: DIM, letterSpacing: 2, marginTop: 10 }}>
          OR PRESS R
        </div>
      </div>
    </div>
  )
}
