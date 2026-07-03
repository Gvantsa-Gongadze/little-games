import { useEffect, useRef, useState } from 'react'
import { Application } from 'pixi.js'
import { joinColourBlazeRoom } from '@/engine/ColyseusClient'
import type { Room } from 'colyseus.js'
import { supabase } from '@/lib/supabase'
import { loadProgress, saveProgress } from '@/lib/progress'
import { ColourBlazeScene } from './scenes/ColourBlazeScene'
import { GAME_ID, type LevelConfig } from './constants'

interface Props { onGameOver?: (score: number) => void }

export default function ColourBlazeCanvas({ onGameOver }: Props) {
  const mountRef      = useRef<HTMLDivElement>(null)
  const onGameOverRef = useRef(onGameOver)
  const [initError, setInitError] = useState<string | null>(null)

  useEffect(() => { onGameOverRef.current = onGameOver })

  useEffect(() => {
    const app = new Application()
    let destroyed = false
    let room:  Room | null = null
    let scene: ColourBlazeScene | null = null
    let onResize: (() => void) | null  = null
    let userId: string | null = null

    function requestLevel(level: number): Promise<LevelConfig | null> {
      return new Promise(resolve => {
        const unsub = room!.onMessage('level_data', (data: LevelConfig | null) => {
          unsub()
          resolve(data)
        })
        room!.send('request_level', { level })
      })
    }

    // Level-ups go through here so every one is checkpointed to Supabase —
    // reloading the page resumes at the saved level.
    async function requestLevelAndSave(level: number): Promise<LevelConfig | null> {
      const config = await requestLevel(level)
      if (config && userId) void saveProgress(GAME_ID, userId, level, 0)
      return config
    }

    async function init() {
      const [joinedRoom, savedLevel] = await Promise.all([
        joinColourBlazeRoom(),
        (async () => {
          const { data } = await supabase.auth.getUser()
          userId = data.user?.id ?? null
          if (!userId) return 1
          const progress = await loadProgress(GAME_ID, userId)
          return progress ? Math.max(1, progress.level) : 1
        })(),
        app.init({ resizeTo: window, backgroundColor: 0x111111 }),
      ])
      room = joinedRoom
      ;(globalThis as Record<string, unknown>).__PIXI_APP__ = app
      if (destroyed) return

      mountRef.current!.appendChild(app.canvas)

      // Resume from the saved level — never reset to 1 on reload
      const firstLevel = await requestLevel(savedLevel)
      if (!firstLevel || destroyed) return

      const s = new ColourBlazeScene(app, (score) => {
        // Run over: record best score; next run starts fresh at level 1
        if (userId) void saveProgress(GAME_ID, userId, 1, score)
        onGameOverRef.current?.(score)
      }, requestLevelAndSave)
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
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: '100vw', height: '100vh', color: '#ff4444', fontFamily: 'monospace',
    }}>
      Failed to connect: {initError}
    </div>
  )

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
}
