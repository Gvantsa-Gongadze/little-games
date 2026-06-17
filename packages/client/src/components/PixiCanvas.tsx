import { useEffect, useRef } from 'react'
import { Application } from 'pixi.js'
import { SceneManager } from '@/game/SceneManager'
import { MenuScene } from '@/game/scenes/MenuScene'
import { GameScene } from '@/game/scenes/GameScene'

export default function PixiCanvas() {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const app = new Application()
    let manager: SceneManager

    async function init() {
      await app.init({
        width: window.innerWidth,
        height: window.innerHeight,
        background: '#0f0f0f',
        antialias: true,
        resizeTo: window,
      })

      mountRef.current?.appendChild(app.canvas)

      manager = new SceneManager(app)

      const menu = new MenuScene(() => {
        const game = new GameScene()
        app.stage.addChild(game.view)
        manager.switch(game)
      })

      app.stage.addChild(menu.view)
      manager.switch(menu)

      app.ticker.add(ticker => manager.update(ticker.deltaTime))
    }

    init()

    return () => {
      app.destroy(true)
    }
  }, [])

  return <div ref={mountRef} style={{ width: '100vw', height: '100vh' }} />
}
