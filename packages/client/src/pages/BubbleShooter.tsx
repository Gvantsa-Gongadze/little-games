import BubbleShooterCanvas from '@/games/bubble-shooter/BubbleShooterCanvas'
import { BackButton }       from '@/components/BackButton'

export default function BubbleShooter() {
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <BubbleShooterCanvas />
      <BackButton />
    </div>
  )
}
