import { useEffect, useState } from 'react'
import { supabase }        from '@/lib/supabase'
import T from '@/data/strings.json'
import { getLeaderboard }  from '@/lib/scores'

type Entry = { score: number; user_id: string; username: string | null; created_at: string }

interface Props {
  score:     number
  onRestart: () => void
}

const GREEN  = '#33ff66'
const DIM    = '#1a5c2a'
const YELLOW = '#ffdd00'
const FONT   = '"Courier New", "Lucida Console", monospace'

export function LeaderboardOverlay({ score, onRestart }: Props) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [userId,  setUserId]  = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
    getLeaderboard('asteroids', 10)
      .then(data => { setEntries(data ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const displayName = (e: Entry) => e.username || '???'

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.code === 'KeyR') onRestart() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onRestart])

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 10,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.82)',
      fontFamily: FONT,
    }}>
      <div style={{
        width: 380, padding: '32px 36px',
        border: `2px solid ${GREEN}`,
        boxShadow: `0 0 24px ${GREEN}44, inset 0 0 40px rgba(0,0,0,0.6)`,
        background: '#010e04',
        color: GREEN,
        textAlign: 'center',
      }}>
        {/* Title */}
        <div style={{ fontSize: 26, letterSpacing: 6, marginBottom: 6 }}>
          {T.common.gameOver}
        </div>

        {/* Player's score */}
        <div style={{ fontSize: 14, letterSpacing: 3, color: YELLOW, marginBottom: 24 }}>
          {T.hud.scoreLabel} &nbsp; {String(score).padStart(6, '0')}
        </div>

        {/* Divider */}
        <div style={{ borderTop: `1px solid ${DIM}`, marginBottom: 18 }} />

        {/* Leaderboard header */}
        <div style={{ fontSize: 11, letterSpacing: 4, marginBottom: 14, color: DIM }}>
          {T.leaderboard.top10}
        </div>

        {/* Entries */}
        {loading ? (
          <div style={{ fontSize: 10, color: DIM, letterSpacing: 2, marginBottom: 24 }}>
            {T.leaderboard.loading}
          </div>
        ) : entries.length === 0 ? (
          <div style={{ fontSize: 10, color: DIM, letterSpacing: 2, marginBottom: 24 }}>
            {T.leaderboard.noScores}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
            <tbody>
              {entries.map((e, i) => {
                const isYou = e.user_id === userId
                return (
                  <tr key={i} style={{ color: isYou ? YELLOW : GREEN }}>
                    <td style={{ fontSize: 10, padding: '4px 0', letterSpacing: 1, textAlign: 'right', width: 28, opacity: 0.5 }}>
                      {`#${i + 1}`}
                    </td>
                    <td style={{ fontSize: 13, padding: '4px 8px', letterSpacing: 2, textAlign: 'right' }}>
                      {String(e.score).padStart(6, '0')}
                    </td>
                    <td style={{ fontSize: 9, padding: '4px 0 4px 8px', letterSpacing: 1, textAlign: 'left' }}>
                      {displayName(e)}{isYou ? ' ◄' : ''}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {/* Divider */}
        <div style={{ borderTop: `1px solid ${DIM}`, marginBottom: 20 }} />

        {/* Play again button */}
        <button
          onClick={onRestart}
          style={{
            fontFamily: FONT,
            fontSize: 13,
            letterSpacing: 4,
            padding: '10px 24px',
            background: 'transparent',
            border: `1px solid ${GREEN}`,
            color: GREEN,
            cursor: 'pointer',
            boxShadow: `0 0 10px ${GREEN}44`,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#0a2e12')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          {T.leaderboard.playAgain}
        </button>

        <div style={{ fontSize: 9, color: DIM, letterSpacing: 2, marginTop: 10 }}>
          {T.leaderboard.restartHint}
        </div>
      </div>
    </div>
  )
}
