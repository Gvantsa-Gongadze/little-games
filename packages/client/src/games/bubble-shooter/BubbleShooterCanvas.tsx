import { useEffect, useRef, useState } from 'react'
import { type Room }                   from 'colyseus.js'
import { Application }                 from 'pixi.js'
import { joinBubbleShooterRoom }       from '@/engine/ColyseusClient'
import { BubbleShooterScene }          from './scenes/BubbleShooterScene'
import { BubbleLeaderboardOverlay }    from './BubbleLeaderboardOverlay'
import { type BubbleColor }            from './constants'

interface Props {
  onGameOver?: (score: number, state: 'won' | 'lost') => void
}

// How many colors to keep pre-fetched in the queue
const QUEUE_TARGET    = 20
const REFILL_AT       = 10   // request more when fewer than this many remain

export default function BubbleShooterCanvas({ onGameOver }: Props) {
  const mountRef      = useRef<HTMLDivElement>(null)
  const onGameOverRef = useRef(onGameOver)
  const [gameOver, setGameOver] = useState<{ score: number; state: 'won' | 'lost' } | null>(null)

  useEffect(() => {
    onGameOverRef.current = onGameOver
  })

  useEffect(() => {
    const app = new Application()
    let destroyed  = false
    let initDone   = false
    let onResize:  (() => void) | null = null
    let room:      Room | null = null

    async function init() {
      // Join the server room first — it pre-seeds the color queue before we
      // create the scene so getNextColor never has to wait.
      room = await joinBubbleShooterRoom()
      if (destroyed) { room.leave(); return }

      await app.init({
        background:  '#0a0a1a',
        antialias:   true,
        width:       window.innerWidth,
        height:      window.innerHeight,
        resolution:  window.devicePixelRatio || 1,
        autoDensity: true,
      })

      initDone = true

      if (destroyed) {
        app.destroy(true)
        return
      }

      if (!mountRef.current) return
      mountRef.current.appendChild(app.canvas)

      // colorIndex is the local read pointer into the server-synced queue array.
      // The server only appends to the queue; we never mutate it client-side.
      let colorIndex = 0
      let scene: BubbleShooterScene | null = null

      const getNextColor = (): BubbleColor => {
        const color = (room!.state.colorQueue[colorIndex] as BubbleColor) ?? 'blue'
        colorIndex++

        // Ask the server to replenish whenever the look-ahead buffer runs low.
        const remaining = room!.state.colorQueue.length - colorIndex
        if (remaining < REFILL_AT) {
          const boardColors = scene?.grid.getBoardColors() ?? []
          room!.send('refill', { count: QUEUE_TARGET - remaining, boardColors })
        }

        return color
      }

      scene = new BubbleShooterScene(app, getNextColor, (score, state) => {
        onGameOverRef.current?.(score, state)
        setGameOver({ score, state })
      })
      app.stage.addChild(scene.view)
      app.ticker.add(ticker => scene.update(ticker.deltaTime))

      onResize = () => app.renderer.resize(window.innerWidth, window.innerHeight)
      window.addEventListener('resize', onResize)
    }

    init()

    return () => {
      destroyed = true
      room?.leave()
      if (onResize) window.removeEventListener('resize', onResize)
      if (initDone) app.destroy(true)
    }
  }, [])

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      {gameOver !== null && (
        <BubbleLeaderboardOverlay
          score={gameOver.score}
          state={gameOver.state}
          onRestart={() => window.location.reload()}
        />
      )}
    </div>
  )
}
