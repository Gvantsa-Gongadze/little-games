import { useEffect, useRef, useState } from 'react'
import { Application }          from 'pixi.js'
import { SceneManager }         from '@/game/SceneManager'
import { AsteroidsScene }       from '@/game/scenes/AsteroidsScene'
import { LeaderboardOverlay }   from './LeaderboardOverlay'

interface Props {
  onGameOver?: (score: number) => void
}

export default function AsteroidsCanvas({ onGameOver }: Props) {
  const mountRef      = useRef<HTMLDivElement>(null)
  const onGameOverRef = useRef(onGameOver)
  const restartRef    = useRef<() => void>(() => {})
  const [gameOverScore, setGameOverScore] = useState<number | null>(null)

  useEffect(() => {
    onGameOverRef.current = onGameOver
  })

  useEffect(() => {
    const app = new Application()
    let manager: SceneManager
    let destroyed = false

    async function init() {
      await app.init({
        width: window.innerWidth,
        height: window.innerHeight,
        background: '#000000',
        antialias: true,
        resizeTo: window,
      })
      if (destroyed) { app.destroy(true); return }

      mountRef.current?.appendChild(app.canvas)
      manager = new SceneManager(app)

      const startScene = () => {
        manager.switch(new AsteroidsScene((score) => {
          onGameOverRef.current?.(score)
          setGameOverScore(score)
        }))
      }
      restartRef.current = startScene
      startScene()

      app.ticker.add(ticker => manager.update(ticker.deltaTime))
    }

    init()
    return () => { destroyed = true; if (app.renderer) app.destroy(true) }
  }, [])

  const handleRestart = () => {
    setGameOverScore(null)
    restartRef.current()
  }

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', background: '#000' }}>
      {/* canvas gets a phosphor glow */}
      <div ref={mountRef} style={{ width: '100%', height: '100%', filter: 'drop-shadow(0 0 6px #33ff66)' }} />

      {/* CRT scanlines overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.18) 3px, rgba(0,0,0,0.18) 4px)',
      }} />

      {/* vignette */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.65) 100%)',
      }} />

      {/* leaderboard overlay on game over */}
      {gameOverScore !== null && (
        <LeaderboardOverlay score={gameOverScore} onRestart={handleRestart} />
      )}
    </div>
  )
}
