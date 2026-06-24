import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { GAMES } from '@/data/games'
import T from '@/data/strings.json'
import GameCard from '@/components/GameCard'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function Home() {
  const { user, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [message, setMessage] = useState('')

  if (loading) return <LoadingSpinner />

  async function signIn() {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setMessage(error.message)
  }

  async function signUp() {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username: username.trim() || email.split('@')[0] } },
    })
    if (error) setMessage(error.message)
    else setMessage(T.home.confirmEmail)
  }

  if (user) {
    return (
      <div style={page}>
        <header style={header}>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.5px' }}>{T.home.title}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: '#666', fontSize: 13 }}>{user.user_metadata?.username || user.email}</span>
            <button onClick={() => supabase.auth.signOut()} style={signOutBtn}>{T.home.signOut}</button>
          </div>
        </header>

        <main>
          <p style={{ color: '#555', marginBottom: 28, fontSize: 14 }}>{T.home.tagline}</p>
          <div style={grid}>
            {GAMES.map(game => <GameCard key={game.id} game={game} />)}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div style={authPage}>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>{T.home.title}</h1>
      <p style={{ color: '#555', marginBottom: 32, fontSize: 14 }}>{T.home.signInTagline}</p>
      <form
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: 240 }}
        onSubmit={e => e.preventDefault()}
      >
        <input
          placeholder={T.home.usernamePlaceholder}
          type="text"
          autoComplete="username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          style={input}
        />
        <input
          placeholder={T.home.emailPlaceholder}
          type="email"
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={input}
        />
        <input
          placeholder={T.home.passwordPlaceholder}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={input}
        />
        {message && (
          <p style={{ color: message.startsWith('Check') ? '#4ade80' : '#f87171', fontSize: 13, textAlign: 'center' }}>
            {message}
          </p>
        )}
        <button type="submit" onClick={signIn} style={primaryBtn}>{T.home.signIn}</button>
        <button type="button" onClick={signUp} style={secondaryBtn}>{T.home.signUp}</button>
      </form>
    </div>
  )
}

const page: React.CSSProperties = {
  minHeight: '100vh',
  padding: '28px 40px',
  background: '#0f0f0f',
}

const header: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 36,
  paddingBottom: 20,
  borderBottom: '1px solid #1a1a1a',
}

const grid: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 20,
}

const authPage: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100vh',
  background: '#0f0f0f',
}

const input: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 7,
  border: '1px solid #222',
  background: '#161616',
  color: '#fff',
  fontSize: 14,
  outline: 'none',
}

const primaryBtn: React.CSSProperties = {
  width: '100%',
  padding: '10px 0',
  background: '#00ff99',
  color: '#000',
  border: 'none',
  borderRadius: 7,
  fontWeight: 700,
  fontSize: 14,
  cursor: 'pointer',
  marginTop: 4,
}

const secondaryBtn: React.CSSProperties = {
  ...primaryBtn,
  background: '#1a1a1a',
  color: '#aaa',
  border: '1px solid #222',
}

const signOutBtn: React.CSSProperties = {
  padding: '6px 14px',
  background: 'transparent',
  color: '#555',
  border: '1px solid #222',
  borderRadius: 6,
  fontSize: 13,
  cursor: 'pointer',
}
