import ThreeCanvas from '@/three/ThreeCanvas'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default function Game3D() {
  return (
    <ErrorBoundary>
      <ThreeCanvas />
    </ErrorBoundary>
  )
}
