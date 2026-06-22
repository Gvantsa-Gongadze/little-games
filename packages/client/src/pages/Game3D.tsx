import ThreeCanvas from '@/games/cube-3d/ThreeCanvas'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { BackButton }    from '@/components/BackButton'

export default function Game3D() {
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <ErrorBoundary>
        <ThreeCanvas />
      </ErrorBoundary>
      <BackButton />
    </div>
  )
}
