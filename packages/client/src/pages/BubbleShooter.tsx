import BubbleShooterCanvas from '@/games/bubble-shooter/BubbleShooterCanvas'
import { BackButton }      from '@/components/BackButton'
import { supabase }        from '@/lib/supabase'
import { submitScore }     from '@/lib/scores'

export default function BubbleShooter() {
  async function handleGameOver(score: number) {
    const { data } = await supabase.auth.getUser()
    if (data.user) {
      const username = data.user.user_metadata?.username ?? null
      await submitScore('bubble-shooter', score, data.user.id, username)
    }
  }

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <BubbleShooterCanvas onGameOver={handleGameOver} />
      <BackButton />
    </div>
  )
}
