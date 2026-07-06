import ColourBlazeCanvas from '@/games/colour-blaze-shooter/ColourBlazeCanvas'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { BackButton }    from '@/components/BackButton'
import { supabase }      from '@/lib/supabase'
import { submitScore }   from '@/lib/scores'
import { GAME_ID }       from '@/games/colour-blaze-shooter/constants'

export default function ColourBlazeShooter() {
  async function handleGameOver(score: number) {
    const { data } = await supabase.auth.getUser()
    if (data.user) {
      const username = data.user.user_metadata?.username ?? null
      await submitScore(GAME_ID, score, data.user.id, username)
    }
  }

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <ErrorBoundary>
        <ColourBlazeCanvas onGameOver={handleGameOver} />
      </ErrorBoundary>
      <BackButton />
    </div>
  )
}
