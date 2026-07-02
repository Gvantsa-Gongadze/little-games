import { useEffect, useRef, useState } from 'react'
import { Application } from 'pixi.js'
import { ColourBlazeScene } from './scenes/ColourBlazeScene'

interface Props { onGameOver?: (score: number) => void }

export default function ColourBlazeCanvas({ onGameOver }: Props) {
  const mountRef      = useRef<HTMLDivElement>(null)
  const onGameOverRef = useRef(onGameOver)
  const [initError, setInitError] = useState<string | null>(null)

  useEffect(() => { onGameOverRef.current = onGameOver })

  useEffect(() => {
    const app = new Application()
    let destroyed = false
    let scene: ColourBlazeScene | null = null
    let onResize: (() => void) | null  = null

    async function init() {
      await app.init({ resizeTo: window, backgroundColor: 0x111111 })
      ;(globalThis as Record<string, unknown>).__PIXI_APP__ = app
      if (destroyed) return

      mountRef.current!.appendChild(app.canvas)

      const s = new ColourBlazeScene(app, (score) => {
        onGameOverRef.current?.(score)
      })
      scene = s
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
      if (onResize) window.removeEventListener('resize', onResize)
      scene?.destroy()
      app.destroy(true)
    }
  }, [])

  if (initError) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: '100vw', height: '100vh', color: '#ff4444', fontFamily: 'monospace',
    }}>
      Failed to start: {initError}
    </div>
  )

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
}
