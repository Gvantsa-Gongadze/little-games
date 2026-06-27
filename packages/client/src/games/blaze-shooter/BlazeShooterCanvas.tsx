import { useEffect, useRef, useState } from 'react'
import { Application } from 'pixi.js'
import { joinBlazeShooterRoom } from '@/engine/ColyseusClient'
import type { Room } from 'colyseus.js'
import { BlazeShooterScene } from './scenes/BlazeShooterScene'
import type { LevelConfig }  from './constants'
import BlazeLeaderboardOverlay from './BlazeLeaderboardOverlay'

interface Props { onGameOver?: (score: number) => void }

export default function BlazeShooterCanvas({ onGameOver }: Props) {
  const mountRef      = useRef<HTMLDivElement>(null)
  const onGameOverRef = useRef(onGameOver)
  const [gameOver, setGameOver]   = useState<{ score: number } | null>(null)
  const [initError, setInitError] = useState<string | null>(null)

  useEffect(() => {
    onGameOverRef.current = onGameOver
  })

  useEffect(() => {
    const app = new Application()
    let destroyed = false
    let onResize: (() => void) | null = null
    let room: Room | null = null
    let scene: BlazeShooterScene | null = null

    function requestLevel(level: number): Promise<LevelConfig | null> {
      return new Promise(resolve => {
        const unsub = room!.onMessage('level_data', (data: LevelConfig | null) => {
          unsub()
          resolve(data)
        })
        room!.send('request_level', { level })
      })
    }

    async function init() {
      room = await joinBlazeShooterRoom()

      await app.init({ resizeTo: window, backgroundColor: 0x0a0a0a })
      if (destroyed) return

      mountRef.current!.appendChild(app.canvas)

      const firstLevel = await requestLevel(1)
      if (!firstLevel) return

      const s = new BlazeShooterScene(app, requestLevel, (score) => {
        onGameOverRef.current?.(score)
        setGameOver({ score })
      })
      scene = s
      s.loadLevel(firstLevel)
      app.stage.addChild(s.view)
      app.ticker.add(t => s.update(t.deltaTime))

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

  return (
    <div style={{ position:'relative', width:'100vw', height:'100vh' }}>
      <div ref={mountRef} style={{ width:'100%', height:'100%' }} />
      {gameOver && (
        <BlazeLeaderboardOverlay
          score={gameOver.score}
          onRestart={() => window.location.reload()}
        />
      )}
    </div>
  )
}