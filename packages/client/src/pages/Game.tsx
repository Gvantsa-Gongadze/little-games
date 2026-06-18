import { useEffect, useRef } from 'react'
import { Room } from 'colyseus.js'
import { joinGameRoom } from '@/game/ColyseusClient'
import { submitScore } from '@/lib/scores'
import { supabase } from '@/lib/supabase'
import PixiCanvas from '@/components/PixiCanvas'
import { ErrorBoundary } from '@/components/ErrorBoundary'

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
      await submitScore('2d-game', score, data.user.id)
    }
  }

  return (
    <ErrorBoundary>
      <PixiCanvas onGameOver={handleGameOver} />
    </ErrorBoundary>
  )
}
