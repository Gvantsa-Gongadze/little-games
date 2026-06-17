import { useNavigate } from 'react-router-dom'

export default function Home() {
  const navigate = useNavigate()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16 }}>
      <h1>Little Games</h1>
      <button onClick={() => navigate('/game')}>Play 2D Game</button>
      <button onClick={() => navigate('/game3d')}>Play 3D Game</button>
    </div>
  )
}
