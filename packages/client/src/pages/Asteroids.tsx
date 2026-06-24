import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AsteroidsCanvas from '@/games/asteroids/AsteroidsCanvas'
import { BackButton }   from '@/components/BackButton'
import { supabase }     from '@/lib/supabase'
import { submitScore }  from '@/lib/scores'

export default function AsteroidsPage() {
  const navigate = useNavigate()

  async function handleGameOver(score: number) {
    const { data } = await supabase.auth.getUser()
    if (data.user) await submitScore('asteroids', score, data.user.id)
  }

  useEffect(() => {
    const back = (e: KeyboardEvent) => {
      if (e.code === 'Escape') navigate('/lobby')
    }
    window.addEventListener('keydown', back)
    return () => window.removeEventListener('keydown', back)
  }, [navigate])

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <AsteroidsCanvas onGameOver={handleGameOver} />
      <BackButton />
    </div>
  )
}
