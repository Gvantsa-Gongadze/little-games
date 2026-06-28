import { useEffect, useRef, useState } from 'react'
import { Application } from 'pixi.js'
import { joinBlazeShooterRoom } from '@/engine/ColyseusClient'
import type { Room } from 'colyseus.js'
import { BlazeShooterScene } from './scenes/BlazeShooterScene'
import type { LevelConfig }  from './constants'

export default function BlazeShooterCanvas() {
  const mountRef = useRef<HTMLDivElement>(null)
  const [initError, setInitError] = useState<string | null>(null)

  useEffect(() => {
    const app = new Application()
    let destroyed = false
    let onResize: (() => void) | null = null
    let room: Room | null = null
    let scene: BlazeShooterScene | null = null

    async function init() {
      room = await joinBlazeShooterRoom()

      await app.init({ resizeTo: window, backgroundColor: 0xd4b08c })
      if (destroyed) return

      mountRef.current!.appendChild(app.canvas)

      const unsub = room.onMessage('level_data', (data: LevelConfig | null) => {
        unsub()
        if (data) scene?.loadLevel(data)
      })
      room.send('request_level', { level: 1 })

      const s = new BlazeShooterScene()
      scene = s
      app.stage.addChild(s.view)

      onResize = () => s.onResize()
      window.addEventListener('resize', onResize)
    }

    init().catch(err => {
      if (!destroyed) setInitError(String(err?.message ?? err))
    })

    return () => {
      destroyed = true
      room?.leave()
      if (onResize) window.removeEventListener('resize', onResize)
      scene?.destroy()
      app.destroy(true)
    }
  }, [])

  if (initError) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
      width:'100vw', height:'100vh', color:'#ff4444', fontFamily:'monospace' }}>
      Failed to connect: {initError}
    </div>
  )

  return <div ref={mountRef} style={{ width:'100vw', height:'100vh' }} />
}