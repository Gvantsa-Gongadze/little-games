import { useEffect, useRef, useState } from 'react'
import { WebGLRenderer } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { CubeScene } from './scenes/CubeScene'

function detectWebGL(): Error | null {
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
  if (!gl) return new Error('WebGL is not supported in this browser')
  return null
}

export default function ThreeCanvas() {
  const mountRef = useRef<HTMLDivElement>(null)
  const [webGLError] = useState<Error | null>(detectWebGL)

  useEffect(() => {
    if (webGLError) return

    const mount = mountRef.current!
    const renderer = new WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    mount.appendChild(renderer.domElement)

    const game = new CubeScene(mount.clientWidth, mount.clientHeight)
    const controls = new OrbitControls(game.camera, renderer.domElement)
    controls.enableDamping = true

    let lastTime = performance.now()
    let animId: number

    function animate() {
      animId = requestAnimationFrame(animate)
      const now = performance.now()
      const delta = (now - lastTime) / (1000 / 60)
      lastTime = now
      game.update(delta)
      controls.update()
      renderer.render(game.scene, game.camera)
    }
    animate()

    const observer = new ResizeObserver(() => {
      const w = mount.clientWidth
      const h = mount.clientHeight
      game.camera.aspect = w / h
      game.camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    })
    observer.observe(mount)

    return () => {
      cancelAnimationFrame(animId)
      observer.disconnect()
      controls.dispose()
      game.dispose()
      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
  }, [webGLError])

  // All hooks above — safe to throw now
  if (webGLError) throw webGLError

  return <div ref={mountRef} style={{ width: '100vw', height: '100vh' }} />
}
