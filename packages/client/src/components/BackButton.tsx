import { useNavigate } from 'react-router-dom'

const FONT = '"Courier New", "Lucida Console", monospace'

export function BackButton() {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate('/')}
      style={{
        position: 'absolute',
        top: 16,
        left: 16,
        zIndex: 20,
        fontFamily: FONT,
        fontSize: 10,
        letterSpacing: 2,
        padding: '7px 13px',
        background: 'rgba(0,8,0,0.75)',
        border: '1px solid #33ff6655',
        color: '#33ff66',
        cursor: 'pointer',
        userSelect: 'none',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(51,255,102,0.13)'
        e.currentTarget.style.borderColor = '#33ff66'
        e.currentTarget.style.boxShadow   = '0 0 8px #33ff6633'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'rgba(0,8,0,0.75)'
        e.currentTarget.style.borderColor = '#33ff6655'
        e.currentTarget.style.boxShadow   = 'none'
      }}
    >
      ◄ LOBBY
    </button>
  )
}
