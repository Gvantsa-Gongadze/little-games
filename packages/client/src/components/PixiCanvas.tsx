import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Application } from 'pixi.js'
import { SceneManager } from '@/game/SceneManager'
import { MenuScene } from '@/game/scenes/MenuScene'
import { GameScene } from '@/game/scenes/GameScene'
import LoadingSpinner from './LoadingSpinner'

interface Props {
  onGameOver?: (score: number) => void
}

export default function PixiCanvas({ onGameOver }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const onGameOverRef = useRef(onGameOver)
  useLayoutEffect(() => { onGameOverRef.current = onGameOver })
  const [ready, setReady] = useState(false)
  const [initError, setInitError] = useState<Error | null>(null)

  useEffect(() => {
    const app = new Application()
    let manager: SceneManager
    let destroyed = false

    async function init() {
      try {
        await app.init({
          width: window.innerWidth,
          height: window.innerHeight,
          background: '#0f0f0f',
          antialias: true,
          resizeTo: window,
        })
      } catch (e) {
        setInitError(e instanceof Error ? e : new Error('Pixi.js failed to initialise'))
        return
      }

      if (destroyed) {
        app.destroy(true)
        return
      }

      mountRef.current?.appendChild(app.canvas)

      manager = new SceneManager(app)

      const menu = new MenuScene(() => {
        manager.switch(new GameScene(onGameOverRef.current))
      })

      manager.switch(menu)

      app.ticker.add(ticker => manager.update(ticker.deltaTime))
      setReady(true)
    }

    init()

    return () => {
      destroyed = true
      if (app.renderer) {
        app.destroy(true)
      }
    }
  }, [])

  if (initError) throw initError

  return (
    <>
      {!ready && <LoadingSpinner />}
      <div ref={mountRef} style={{ width: '100vw', height: '100vh' }} />
    </>
  )
}
