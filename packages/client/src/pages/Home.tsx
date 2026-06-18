import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export default function Home() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (loading) return <div style={center}>Loading...</div>

  async function signIn() {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
  }

  async function signUp() {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) setError(error.message)
    else setError('Check your email to confirm your account.')
  }

  if (user) {
    return (
      <div style={center}>
        <h1>Little Games</h1>
        <p style={{ marginBottom: 16, color: '#aaa' }}>{user.email}</p>
        <button onClick={() => navigate('/game')} style={btn}>Play 2D Game</button>
        <button onClick={() => navigate('/game3d')} style={btn}>Play 3D Game</button>
        <button onClick={() => supabase.auth.signOut()} style={{ ...btn, background: '#333' }}>
          Sign out
        </button>
      </div>
    )
  }

  return (
    <div style={center}>
      <h1 style={{ marginBottom: 24 }}>Little Games</h1>
      <form style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }} onSubmit={e => e.preventDefault()}>
        <input placeholder="Email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} style={input} />
        <input placeholder="Password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} style={input} />
        {error && <p style={{ color: '#f87171', marginBottom: 8 }}>{error}</p>}
        <button type="submit" onClick={signIn} style={btn}>Sign in</button>
        <button type="button" onClick={signUp} style={{ ...btn, background: '#333' }}>Sign up</button>
      </form>
    </div>
  )
}

const center: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  justifyContent: 'center', height: '100vh', gap: 8,
}
const btn: React.CSSProperties = {
  padding: '10px 24px', background: '#00ff99', color: '#000',
  border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, width: 180,
}
const input: React.CSSProperties = {
  padding: '10px 14px', borderRadius: 6, border: '1px solid #333',
  background: '#1a1a1a', color: '#fff', width: 180, marginBottom: 4,
}
