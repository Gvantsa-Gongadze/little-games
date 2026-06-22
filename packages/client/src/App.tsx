import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from '@/pages/Home'
import Game from '@/pages/Game'
import Game3D from '@/pages/Game3D'
import AsteroidsPage from '@/pages/Asteroids'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game" element={<Game />} />
        <Route path="/game3d" element={<Game3D />} />
        <Route path="/asteroids" element={<AsteroidsPage />} />
      </Routes>
    </BrowserRouter>
  )
}
