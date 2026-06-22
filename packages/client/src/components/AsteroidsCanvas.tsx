import { useEffect, useRef } from 'react'
import { Application } from 'pixi.js'
import { SceneManager }    from '@/game/SceneManager'
import { AsteroidsScene }  from '@/game/scenes/AsteroidsScene'

interface Props {
  onGameOver?: (score: number) => void
}

export default function AsteroidsCanvas({ onGameOver }: Props) {
  const mountRef      = useRef<HTMLDivElement>(null)
  const onGameOverRef = useRef(onGameOver)

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
          startScene()
        }))
      }
      startScene()

      app.ticker.add(ticker => manager.update(ticker.deltaTime))
    }

    init()
    return () => { destroyed = true; if (app.renderer) app.destroy(true) }
  }, [])

  return <div ref={mountRef} style={{ width: '100vw', height: '100vh' }} />
}
