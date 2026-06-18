import { useEffect, useRef, useState } from 'react'
import { WebGLRenderer } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { CubeScene } from './scenes/CubeScene'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function ThreeCanvas() {
  const mountRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const mount = mountRef.current!
    const width = mount.clientWidth
    const height = mount.clientHeight

    const renderer = new WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(width, height)
    mount.appendChild(renderer.domElement)

    const game = new CubeScene(width, height)
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
    setReady(true)

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
  }, [])

  return (
    <>
      {!ready && <LoadingSpinner />}
      <div ref={mountRef} style={{ width: '100vw', height: '100vh' }} />
    </>
  )
}
