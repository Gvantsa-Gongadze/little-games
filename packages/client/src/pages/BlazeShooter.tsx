import BlazeShooterCanvas from '@/games/blaze-shooter/BlazeShooterCanvas'
import { BackButton }     from '@/components/BackButton'
import { supabase }       from '@/lib/supabase'
import { submitScore }    from '@/lib/scores'

export default function BlazeShooter() {
  async function handleGameOver(score: number) {
    const { data } = await supabase.auth.getUser()
    if (data.user) {
      const username = data.user.user_metadata?.username ?? null
      await submitScore('blaze-shooter', score, data.user.id, username)
    }
  }

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <BlazeShooterCanvas onGameOver={handleGameOver} />
      <BackButton />
    </div>
  )
}