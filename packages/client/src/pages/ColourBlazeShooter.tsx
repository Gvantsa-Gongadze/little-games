import ColourBlazeCanvas from '@/games/colour-blaze-shooter/ColourBlazeCanvas'
import { BackButton }    from '@/components/BackButton'

export default function ColourBlazeShooter() {
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <ColourBlazeCanvas />
      <BackButton />
    </div>
  )
}
