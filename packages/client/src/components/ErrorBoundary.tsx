import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: (error: Error, reset: () => void) => ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  reset = () => this.setState({ error: null })

  render() {
    const { error } = this.state
    if (error) {
      return this.props.fallback
        ? this.props.fallback(error, this.reset)
        : <DefaultFallback error={error} reset={this.reset} />
    }
    return this.props.children
  }
}

function DefaultFallback({ error, reset }: { error: Error; reset: () => void }) {
  const isWebGL = error.message.toLowerCase().includes('webgl') ||
                  error.message.toLowerCase().includes('pixi') ||
                  error.message.toLowerCase().includes('renderer')

  return (
    <div style={overlay}>
      <div style={box}>
        <span style={{ fontSize: 40, marginBottom: 12, display: 'block' }}>
          {isWebGL ? '🖥️' : '⚠️'}
        </span>
        <h2 style={{ color: '#fff', marginBottom: 8, fontSize: 18 }}>
          {isWebGL ? 'WebGL unavailable' : 'Something went wrong'}
        </h2>
        <p style={{ color: '#666', fontSize: 13, marginBottom: 20, maxWidth: 320, textAlign: 'center' }}>
          {isWebGL
            ? 'Your browser or device does not support WebGL. Try updating your browser or enabling hardware acceleration.'
            : error.message}
        </p>
        <button onClick={reset} style={btn}>Try again</button>
      </div>
    </div>
  )
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: '#0f0f0f',
}

const box: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  padding: '36px 32px',
  background: '#111',
  border: '1px solid #222',
  borderRadius: 14,
}

const btn: React.CSSProperties = {
  padding: '9px 24px',
  background: '#00ff99',
  color: '#000',
  border: 'none',
  borderRadius: 7,
  fontWeight: 700,
  fontSize: 14,
  cursor: 'pointer',
}
