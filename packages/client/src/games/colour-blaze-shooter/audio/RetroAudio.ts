class RetroAudioClass {
  private ctx: AudioContext | null = null

  // Returns null when the context isn't running yet (browser autoplay policy).
  // Calling resume() here queues the unlock so the next gesture resolves it.
  private getCtx(): AudioContext | null {
    if (!this.ctx) this.ctx = new AudioContext()
    if (this.ctx.state === 'suspended') this.ctx.resume()
    return this.ctx.state === 'running' ? this.ctx : null
  }

  // Short ascending square blip — volley launch
  fire() {
    const ctx  = this.getCtx()
    if (!ctx) return
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'square'
    osc.frequency.setValueAtTime(300, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(520, ctx.currentTime + 0.06)
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.06)
  }

  // Tiny high click — ball chips a brick (quiet: fires often with big volleys)
  hit() {
    const ctx  = this.getCtx()
    if (!ctx) return
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    gain.gain.setValueAtTime(0.08, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.04)
  }

  // White-noise pop — brick destroyed
  brickBreak() {
    const ctx = this.getCtx()
    if (!ctx) return
    const duration = 0.16
    const samples  = Math.ceil(ctx.sampleRate * duration)
    const buffer   = ctx.createBuffer(1, samples, ctx.sampleRate)
    const data     = buffer.getChannelData(0)
    for (let i = 0; i < samples; i++) data[i] = Math.random() * 2 - 1

    const src  = ctx.createBufferSource()
    src.buffer = buffer

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.25, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)

    src.connect(gain)
    gain.connect(ctx.destination)
    src.start()
  }

  // Ascending 4-note chime — level up
  levelUp() {
    const ctx   = this.getCtx()
    if (!ctx) return
    const freqs = [523, 659, 784, 1047]
    freqs.forEach((freq, i) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'square'
      osc.frequency.value = freq
      const t = ctx.currentTime + i * 0.09
      gain.gain.setValueAtTime(0.13, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
      osc.start(t)
      osc.stop(t + 0.12)
    })
  }

  // Descending sawtooth sweep — game over
  gameOver() {
    const ctx  = this.getCtx()
    if (!ctx) return
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(380, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.8)
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.8)
  }
}

export const RetroAudio = new RetroAudioClass()
