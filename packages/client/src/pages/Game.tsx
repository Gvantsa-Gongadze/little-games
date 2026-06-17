import { useEffect, useRef } from 'react'
import { Room } from 'colyseus.js'
import { joinGameRoom } from '@/game/ColyseusClient'
import PixiCanvas from '@/components/PixiCanvas'

export default function Game() {
  const roomRef = useRef<Room | null>(null)

  useEffect(() => {
    joinGameRoom('Player').then(room => {
      roomRef.current = room
      room.state.players.onAdd((player: any, sessionId: string) => {
        console.log(`Player added: ${sessionId}`, player)
      })
    })

    return () => {
      roomRef.current?.leave()
    }
  }, [])

  return <PixiCanvas />
}
