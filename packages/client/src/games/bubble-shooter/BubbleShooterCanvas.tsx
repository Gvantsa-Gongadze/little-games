import { useEffect, useRef } from 'react'
import { Application }        from 'pixi.js'
import { BubbleShooterScene } from './scenes/BubbleShooterScene'

export default function BubbleShooterCanvas() {
  const mountRef = useRef<HTMLDivElement>(null)

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

      const scene = new BubbleShooterScene(app)
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

  return <div ref={mountRef} style={{ width: '100vw', height: '100vh' }} />
}
