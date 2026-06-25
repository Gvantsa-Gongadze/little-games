import { useEffect, useRef, useState } from 'react'
import { Application }               from 'pixi.js'
import { BubbleShooterScene }        from './scenes/BubbleShooterScene'
import { BubbleLeaderboardOverlay }  from './BubbleLeaderboardOverlay'

interface Props {
  onGameOver?: (score: number, state: 'won' | 'lost') => void
}

export default function BubbleShooterCanvas({ onGameOver }: Props) {
  const mountRef      = useRef<HTMLDivElement>(null)
  const onGameOverRef = useRef(onGameOver)
  const [gameOver, setGameOver] = useState<{ score: number; state: 'won' | 'lost' } | null>(null)

  useEffect(() => {
    onGameOverRef.current = onGameOver
  })

  useEffect(() => {
    const app     = new Application()
    let destroyed = false
    let initDone  = false
    let onResize: (() => void) | null = null

    async function init() {
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

      const scene = new BubbleShooterScene(app, (score, state) => {
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
