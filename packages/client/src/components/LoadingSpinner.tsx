export default function LoadingSpinner() {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0f0f0f',
    }}>
      <div style={{
        width: 48, height: 48,
        border: '3px solid #222',
        borderTop: '3px solid #00ff99',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
