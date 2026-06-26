import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

document.fonts.load('10px "Press Start 2P"').then(() => {
  createRoot(document.getElementById('root')!).render(<App />)
})
