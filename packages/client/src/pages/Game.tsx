import { useEffect, useRef } from 'react'
import { Room } from 'colyseus.js'
import { joinGameRoom } from '@/engine/ColyseusClient'
import { submitScore } from '@/lib/scores'
import { supabase } from '@/lib/supabase'
import PixiCanvas from '@/games/arena-2d/PixiCanvas'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { BackButton }    from '@/components/BackButton'

export default function Game() {
  const roomRef = useRef<Room | null>(null)

  useEffect(() => {
    joinGameRoom('Player').then(room => {
      roomRef.current = room
    })

    return () => { roomRef.current?.leave() }
  }, [])

  async function handleGameOver(score: number) {
    const { data } = await supabase.auth.getUser()
    if (data.user) {
      const username = data.user.user_metadata?.username ?? null
      await submitScore('2d-game', score, data.user.id, username)
    }
  }

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <ErrorBoundary>
        <PixiCanvas onGameOver={handleGameOver} />
      </ErrorBoundary>
      <BackButton />
    </div>
  )
}
