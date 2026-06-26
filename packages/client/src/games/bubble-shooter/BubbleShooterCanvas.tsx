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

const INITIAL_REQUEST = 80   // board (53 cells) + launcher bubbles + early-shot buffer
const QUEUE_TARGET    = 20   // refill target after the board is built
const REFILL_AT       = 8

export default function BubbleShooterCanvas({ onGameOver }: Props) {
  const mountRef      = useRef<HTMLDivElement>(null)
  const onGameOverRef = useRef(onGameOver)
  const [gameOver, setGameOver] = useState<{ score: number; state: 'won' | 'lost' } | null>(null)

  useEffect(() => {
    onGameOverRef.current = onGameOver
  })

  useEffect(() => {
    const app = new Application()
    let destroyed = false
    let initDone  = false
    let onResize: (() => void) | null = null
    let room:     Room | null = null
    let scene:    BubbleShooterScene | null = null

    async function init() {
      room = await joinBubbleShooterRoom()
      if (destroyed) { room.leave(); return }

      // Plain local array — filled by 'colors' messages from the server.
      // No Colyseus schema decoding needed; server sends plain string arrays.
      const colorQueue: BubbleColor[] = []
      let refillPending = false
      let resolveInitial: (() => void) | null = null

      room.onMessage('colors', (batch: string[]) => {
        colorQueue.push(...(batch as BubbleColor[]))
        refillPending = false
        // Unblock the scene-creation await on the very first response
        if (resolveInitial) { resolveInitial(); resolveInitial = null }
      })

      // Fetch initial batch and init Pixi in parallel to minimise startup time
      const colorsReady = new Promise<void>(resolve => {
        resolveInitial = resolve
        room!.send('request_colors', { count: INITIAL_REQUEST, boardColors: [] })
      })

      await Promise.all([
        app.init({
          background:  '#0a0a1a',
          antialias:   true,
          width:       window.innerWidth,
          height:      window.innerHeight,
          resolution:  window.devicePixelRatio || 1,
          autoDensity: true,
        }),
        colorsReady,
      ])

      initDone = true
      if (destroyed) { app.destroy(true); return }
      if (!mountRef.current) return
      mountRef.current.appendChild(app.canvas)

      const getNextColor = (): BubbleColor => {
        if (!refillPending && colorQueue.length < REFILL_AT) {
          refillPending = true
          const boardColors = scene?.grid.getBoardColors() ?? []
          room!.send('request_colors', { count: QUEUE_TARGET, boardColors })
        }
        return colorQueue.shift() ?? 'blue'
      }

      const s = new BubbleShooterScene(app, getNextColor, (score, state) => {
        onGameOverRef.current?.(score, state)
        setGameOver({ score, state })
      })
      scene = s
      app.stage.addChild(s.view)
      app.ticker.add(ticker => s.update(ticker.deltaTime))

      onResize = () => app.renderer.resize(window.innerWidth, window.innerHeight)
      window.addEventListener('resize', onResize)
    }

    init()

    return () => {
      destroyed = true
      room?.leave()
      if (onResize) window.removeEventListener('resize', onResize)
      scene?.destroy()
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
