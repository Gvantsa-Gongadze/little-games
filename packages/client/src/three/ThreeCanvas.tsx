import { useEffect, useRef } from 'react'
import { WebGLRenderer, Clock } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { CubeScene } from './scenes/CubeScene'

export default function ThreeCanvas() {
  const mountRef = useRef<HTMLDivElement>(null)

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

    const clock = new Clock()
    let animId: number

    function animate() {
      animId = requestAnimationFrame(animate)
      const delta = clock.getDelta()
      game.update(delta * 60)
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
  }, [])

  return <div ref={mountRef} style={{ width: '100vw', height: '100vh' }} />
}
