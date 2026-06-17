import { useNavigate } from 'react-router-dom'

export default function Home() {
  const navigate = useNavigate()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <h1 style={{ marginBottom: 24 }}>Little Games</h1>
      <button onClick={() => navigate('/game')}>Play 2D Game</button>
    </div>
  )
}
