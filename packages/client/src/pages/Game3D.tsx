import ThreeCanvas from '@/games/cube-3d/ThreeCanvas'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default function Game3D() {
  return (
    <ErrorBoundary>
      <ThreeCanvas />
    </ErrorBoundary>
  )
}
