import BlazeShooterCanvas from '@/games/blaze-shooter/BlazeShooterCanvas'
import { BackButton }     from '@/components/BackButton'

export default function BlazeShooter() {
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <BlazeShooterCanvas />
      <BackButton />
    </div>
  )
}