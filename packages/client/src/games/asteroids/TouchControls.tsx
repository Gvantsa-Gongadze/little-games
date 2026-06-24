import { useState } from 'react'
import T from '@/data/strings.json'

const GREEN = '#33ff66'
const FONT  = '"Courier New", "Lucida Console", monospace'

const BASE: React.CSSProperties = {
  width: 68, height: 68,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'rgba(0,18,0,0.78)',
  border: `1px solid ${GREEN}55`,
  borderRadius: 10,
  color: GREEN,
  fontFamily: FONT,
  fontSize: 24,
  userSelect: 'none',
  touchAction: 'none',
  WebkitTapHighlightColor: 'transparent',
  cursor: 'pointer',
  transition: 'background 0.06s, box-shadow 0.06s',
}

const PRESSED: React.CSSProperties = {
  background: 'rgba(51,255,102,0.14)',
  boxShadow: `0 0 14px ${GREEN}66`,
  border: `1px solid ${GREEN}cc`,
}

function fireKey(code: string, type: 'keydown' | 'keyup') {
  window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }))
}

interface BtnProps {
  code:   string
  label:  string
  style?: React.CSSProperties
}

function Btn({ code, label, style }: BtnProps) {
  const [down, setDown] = useState(false)

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    setDown(true)
    fireKey(code, 'keydown')
  }
  const onUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDown(false)
    fireKey(code, 'keyup')
  }

  return (
    <div
      style={{ ...BASE, ...(down ? PRESSED : {}), ...style }}
      onPointerDown={onDown}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      {label}
    </div>
  )
}

export function TouchControls() {
  const [visible] = useState(() => navigator.maxTouchPoints > 0 || 'ontouchstart' in window)

  if (!visible) return null

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 5,
      pointerEvents: 'none',
    }}>
      {/* Left cluster — rotate left / right */}
      <div style={{
        position: 'absolute', bottom: 36, left: 24,
        display: 'flex', gap: 14,
        pointerEvents: 'auto',
      }}>
        <Btn code="ArrowLeft"  label={T.touch.left} />
        <Btn code="ArrowRight" label={T.touch.right} />
      </div>

      {/* Right cluster — thrust / fire / hyperspace */}
      <div style={{
        position: 'absolute', bottom: 36, right: 24,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 14,
        pointerEvents: 'auto',
      }}>
        <Btn code="ArrowUp"   label={T.touch.thrust} />
        <div style={{ display: 'flex', gap: 14 }}>
          <Btn code="Space"     label={T.touch.fire} />
          <Btn code="ShiftLeft" label={T.touch.hyperspace} style={{ fontSize: 11, letterSpacing: 1 }} />
        </div>
      </div>
    </div>
  )
}
