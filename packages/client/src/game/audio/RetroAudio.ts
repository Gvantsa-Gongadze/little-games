import type { AsteroidSize } from '../entities/Asteroid'

class RetroAudioClass {
  private ctx: AudioContext | null = null

  private getCtx(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext()
    if (this.ctx.state === 'suspended') this.ctx.resume()
    return this.ctx
  }

  // Short descending square blip
  shoot() {
    const ctx  = this.getCtx()
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'square'
    osc.frequency.setValueAtTime(660, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.07)
    gain.gain.setValueAtTime(0.18, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.07)
  }

  // White-noise burst scaled to asteroid size
  explode(size: AsteroidSize) {
    const ctx      = this.getCtx()
    const duration = size === 'large' ? 0.55 : size === 'medium' ? 0.35 : 0.2
    const volume   = size === 'large' ? 0.7  : size === 'medium' ? 0.45 : 0.28

    const samples = Math.ceil(ctx.sampleRate * duration)
    const buffer  = ctx.createBuffer(1, samples, ctx.sampleRate)
    const data    = buffer.getChannelData(0)
    for (let i = 0; i < samples; i++) data[i] = Math.random() * 2 - 1

    const src  = ctx.createBufferSource()
    src.buffer = buffer

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(volume, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)

    src.connect(gain)
    gain.connect(ctx.destination)
    src.start()
  }

  // Looping low-pass noise — engine hum
  private thrustNode: AudioBufferSourceNode | null = null
  private thrustGain: GainNode | null = null

  startThrust() {
    if (this.thrustNode) return
    const ctx = this.getCtx()

    const samples = ctx.sampleRate * 2
    const buffer  = ctx.createBuffer(1, samples, ctx.sampleRate)
    const data    = buffer.getChannelData(0)
    for (let i = 0; i < samples; i++) data[i] = Math.random() * 2 - 1

    const src  = ctx.createBufferSource()
    src.buffer = buffer
    src.loop   = true

    const filter       = ctx.createBiquadFilter()
    filter.type        = 'lowpass'
    filter.frequency.value = 180

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.06)

    src.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)
    src.start()

    this.thrustNode = src
    this.thrustGain = gain
  }

  stopThrust() {
    if (!this.thrustNode || !this.thrustGain) return
    const ctx  = this.getCtx()
    const node = this.thrustNode
    this.thrustGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.08)
    setTimeout(() => { try { node.stop() } catch { /* already stopped */ } }, 100)
    this.thrustNode = null
    this.thrustGain = null
  }

  // Ascending 4-note chime on power-up collect
  collect() {
    const ctx   = this.getCtx()
    const freqs = [440, 554, 659, 880]
    freqs.forEach((freq, i) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'square'
      osc.frequency.value = freq
      const t = ctx.currentTime + i * 0.055
      gain.gain.setValueAtTime(0.13, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09)
      osc.start(t)
      osc.stop(t + 0.09)
    })
  }

  // Two-tone blip warning when UFO appears
  ufoAlert() {
    const ctx = this.getCtx()
    const freqs = [330, 550]
    freqs.forEach((freq, i) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'square'
      osc.frequency.value = freq
      const t = ctx.currentTime + i * 0.13
      gain.gain.setValueAtTime(0.14, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1)
      osc.start(t)
      osc.stop(t + 0.1)
    })
  }

  // Hyperspace departure — rapid descending square sweep
  hyperspaceIn() {
    const ctx  = this.getCtx()
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.type = 'square'
    osc.frequency.setValueAtTime(900, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.28)
    gain.gain.setValueAtTime(0.18, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.28)
  }

  // Hyperspace arrival — rapid ascending square sweep
  hyperspaceOut() {
    const ctx  = this.getCtx()
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.type = 'square'
    osc.frequency.setValueAtTime(80, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.22)
    gain.gain.setValueAtTime(0.18, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.22)
  }

  // Descending sawtooth sweep on death
  die() {
    const ctx  = this.getCtx()
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(440, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.9)
    gain.gain.setValueAtTime(0.35, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.9)
  }
}

export const RetroAudio = new RetroAudioClass()
