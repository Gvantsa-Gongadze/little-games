import { Container, Graphics, Text } from 'pixi.js'
import type { Scene } from '../SceneManager'
import { Ship }              from '../entities/Ship'
import { Bullet }            from '../entities/Bullet'
import { Asteroid }          from '../entities/Asteroid'
import { UFO, UFO_SCORE }              from '../entities/UFO'
import { PowerUp, DROP_CHANCE, randomType } from '../entities/PowerUp'
import { Particle, explode }           from '../entities/Particle'
import { RetroAudio }        from '../audio/RetroAudio'
import { wrap, circlesOverlap, randomEdgePosition } from '../utils/math'

const W = () => window.innerWidth
const H = () => window.innerHeight

const SCORE_MAP     = { large: 20, medium: 50, small: 100 }
const FIRE_COOLDOWN = 12
const COMBO_WINDOW  = 90   // frames ≈ 1.5 s at 60 fps
const GREEN = '#33ff66'
const FONT  = '"Press Start 2P", monospace'

export class AsteroidsScene implements Scene {
  view = new Container()

  private ship:      Ship
  private bullets:     Bullet[]   = []
  private asteroids:   Asteroid[] = []
  private particles:   Particle[] = []
  private ufoBullets:      Bullet[]    = []
  private ufo:             UFO | null  = null
  private ufoTimer         = 1800
  private powerUps:        PowerUp[]   = []
  private tripleShotTimer  = 0   // frames remaining
  private shieldTimer      = 0   // frames remaining
  private keys       = new Set<string>()
  private score      = 0
  private lives      = 3
  private wave       = 0
  private fireTimer    = 0
  private shake        = 0
  private wasThrusting = false
  private gameOver     = false
  private comboMult       = 1     // 1 | 2 | 3
  private comboTimer      = 0     // frames remaining in combo window
  private hyperspaceTimer = 0     // cooldown frames remaining
  private inHyperspace    = false
  private onGameOver?: (score: number) => void

  private scoreText:      Text
  private livesText:      Text
  private waveText:       Text
  private msgText:        Text
  private waveAnnounce:   Text
  private powerupText:    Text
  private comboText:      Text
  private hyperspaceText: Text

  constructor(onGameOver?: (score: number) => void) {
    this.onGameOver = onGameOver

    this.view.addChild(this.buildStarfield())

    // HUD — score top-center
    this.scoreText = new Text({
      text: 'SCORE\n00000',
      style: { fill: GREEN, fontSize: 12, fontFamily: FONT, align: 'center', lineHeight: 20 },
    })
    this.scoreText.anchor.set(0.5, 0)
    this.scoreText.position.set(W() / 2, 16)

    // lives top-left
    this.livesText = new Text({
      text: 'LIVES  ♥ ♥ ♥',
      style: { fill: GREEN, fontSize: 10, fontFamily: FONT },
    })
    this.livesText.position.set(20, 20)

    // wave top-right
    this.waveText = new Text({
      text: 'WAVE  1',
      style: { fill: GREEN, fontSize: 10, fontFamily: FONT },
    })
    this.waveText.anchor.set(1, 0)
    this.waveText.position.set(W() - 20, 20)

    // wave announcement (center, fades out)
    this.waveAnnounce = new Text({
      text: '',
      style: { fill: GREEN, fontSize: 18, fontFamily: FONT, align: 'center' },
    })
    this.waveAnnounce.anchor.set(0.5)
    this.waveAnnounce.position.set(W() / 2, H() / 2 - 60)
    this.waveAnnounce.alpha = 0

    // game over / message text
    this.msgText = new Text({
      text: '',
      style: { fill: GREEN, fontSize: 16, fontFamily: FONT, align: 'center', lineHeight: 28 },
    })
    this.msgText.anchor.set(0.5)
    this.msgText.position.set(W() / 2, H() / 2)

    // power-up status bottom-center
    this.powerupText = new Text({
      text: '',
      style: { fill: '#00ffff', fontSize: 9, fontFamily: FONT, align: 'center' },
    })
    this.powerupText.anchor.set(0.5, 1)
    this.powerupText.position.set(W() / 2, H() - 16)

    // combo multiplier — shown below score when a chain is active
    this.comboText = new Text({
      text: '',
      style: { fill: '#ffdd00', fontSize: 10, fontFamily: FONT, align: 'center' },
    })
    this.comboText.anchor.set(0.5, 0)
    this.comboText.position.set(W() / 2, 62)
    this.comboText.alpha = 0

    // hyperspace status — bottom-left
    this.hyperspaceText = new Text({
      text: '[SHF] HYPR',
      style: { fill: GREEN, fontSize: 8, fontFamily: FONT },
    })
    this.hyperspaceText.anchor.set(0, 1)
    this.hyperspaceText.position.set(20, H() - 16)
    this.hyperspaceText.alpha = 0.35

    this.ship = new Ship()
    this.ship.reset(W() / 2, H() / 2)

    this.view.addChild(
      this.ship.view,
      this.scoreText, this.livesText, this.waveText,
      this.waveAnnounce, this.msgText, this.powerupText,
      this.comboText, this.hyperspaceText,
    )

    this.spawnWave()
    this.setupInput()
  }

  private buildStarfield(): Graphics {
    const g = new Graphics()
    for (let i = 0; i < 130; i++) {
      const x     = Math.random() * W()
      const y     = Math.random() * H()
      const size  = Math.random() < 0.7 ? 0.5 : 1
      const alpha = 0.1 + Math.random() * 0.35
      g.circle(x, y, size).fill({ color: 0x33ff66, alpha })
    }
    return g
  }

  private setupInput() {
    const down = (e: KeyboardEvent) => {
      this.keys.add(e.code)
      if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight')
          && !this.inHyperspace && this.hyperspaceTimer <= 0 && !this.gameOver) {
        this.triggerHyperspace()
      }
    }
    const up = (e: KeyboardEvent) => this.keys.delete(e.code)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup',   up)
    this._removeInput = () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup',   up)
    }
  }
  private _removeInput = () => {}

  private spawnWave() {
    this.wave++
    this.waveText.text = `WAVE  ${this.wave}`

    this.waveAnnounce.text  = `WAVE ${this.wave}`
    this.waveAnnounce.alpha = 1
    let t = 0
    const fade = () => {
      t += 0.02
      this.waveAnnounce.alpha = Math.max(0, 1 - t)
      if (this.waveAnnounce.alpha > 0) requestAnimationFrame(fade)
    }
    setTimeout(() => requestAnimationFrame(fade), 800)

    // speed caps at 2.5× on wave 13+
    const speedMult = Math.min(1 + (this.wave - 1) * 0.12, 2.5)
    // UFO arrives sooner each wave, minimum 15 s
    this.ufoTimer = Math.max(900, 1800 - this.wave * 60)

    const count = 2 + this.wave
    for (let i = 0; i < count; i++) {
      const pos = randomEdgePosition(W(), H())
      const ast = new Asteroid('large', pos.x, pos.y, undefined, speedMult)
      this.asteroids.push(ast)
      this.view.addChild(ast.view)
    }
  }

  update(delta: number) {
    if (this.gameOver) return

    this.ship.update(delta, this.keys)
    wrap(this.ship, W(), H())

    // thrust sound
    const thrusting = this.keys.has('ArrowUp')
    if (thrusting && !this.wasThrusting) RetroAudio.startThrust()
    if (!thrusting && this.wasThrusting)  RetroAudio.stopThrust()
    this.wasThrusting = thrusting

    // power-up timers
    if (this.tripleShotTimer > 0) {
      this.tripleShotTimer -= delta
      if (this.tripleShotTimer <= 0) this.updatePowerupHUD()
    }
    if (this.shieldTimer > 0) {
      this.shieldTimer -= delta
      if (this.shieldTimer <= 0) { this.ship.setShield(false); this.updatePowerupHUD() }
    }

    // combo window countdown — fade out in the last 30 frames as a "hurry" cue
    if (this.comboTimer > 0) {
      this.comboTimer -= delta
      if (this.comboTimer <= 0) {
        this.comboMult       = 1
        this.comboText.alpha = 0
      } else {
        this.comboText.alpha = this.comboTimer < 30 ? this.comboTimer / 30 : 1
      }
    }

    // hyperspace cooldown countdown
    if (this.hyperspaceTimer > 0) {
      this.hyperspaceTimer -= delta
      if (this.hyperspaceTimer <= 0) this.updateHyperspaceHUD()
    }

    this.fireTimer -= delta
    if (this.keys.has('Space') && this.fireTimer <= 0) {
      this.fireTimer = FIRE_COOLDOWN
      const angle   = this.ship.view.rotation
      const offsets = this.tripleShotTimer > 0 ? [-0.26, 0, 0.26] : [0]
      for (const off of offsets) {
        const b = new Bullet(this.ship.x, this.ship.y, angle + off)
        this.bullets.push(b)
        this.view.addChild(b.view)
      }
      RetroAudio.shoot()
    }

    // screen shake
    if (this.shake > 0.4) {
      this.view.x = (Math.random() - 0.5) * 2 * this.shake
      this.view.y = (Math.random() - 0.5) * 2 * this.shake
      this.shake *= 0.82
    } else if (this.shake > 0) {
      this.view.x = 0
      this.view.y = 0
      this.shake  = 0
    }

    for (const b of this.bullets)  { b.update(delta); wrap(b, W(), H()) }
    for (const a of this.asteroids) { a.update(delta); wrap(a, W(), H()) }
    for (const p of this.particles)   p.update(delta)
    for (const b of this.ufoBullets) { b.update(delta); wrap(b, W(), H()) }
    for (const p of this.powerUps)    p.update(delta)

    // UFO spawn countdown
    if (!this.ufo) {
      this.ufoTimer -= delta
      if (this.ufoTimer <= 0) this.spawnUFO()
    } else {
      this.ufo.update(delta)
      if (!this.ufo.alive) {
        this.ufo.view.destroy()
        this.ufo = null
        this.ufoTimer = 1500 + Math.random() * 600
      } else if (this.ufo.fireTimer <= 0) {
        this.ufo.resetFireTimer()
        const angle = this.ufo.aimAngle(this.ship.x, this.ship.y)
        const b = new Bullet(this.ufo.x, this.ufo.y, angle, 0xff4422)
        this.ufoBullets.push(b)
        this.view.addChild(b.view)
      }
    }

    this.checkAsteroidCollisions()
    this.checkBulletCollisions()
    this.checkShipCollisions()
    this.checkUFOCollisions()
    this.checkPowerUpCollisions()
    this.cleanup()

    if (this.asteroids.length === 0) this.spawnWave()
  }

  private spawnUFO() {
    const size = Math.random() < 0.75 ? 'large' : 'small' as const
    this.ufo = new UFO(size)
    this.view.addChild(this.ufo.view)
    RetroAudio.ufoAlert()
  }

  private checkUFOCollisions() {
    if (!this.ufo) return

    // Player bullets → UFO
    for (const b of this.bullets) {
      if (circlesOverlap(b.x, b.y, b.radius, this.ufo.x, this.ufo.y, this.ufo.radius)) {
        b.life = 0
        this.registerKill(UFO_SCORE[this.ufo.size])
        RetroAudio.explode('medium')
        const frags = explode(this.ufo.x, this.ufo.y, 0, 0, 'medium')
        for (const p of frags) { this.particles.push(p); this.view.addChild(p.view) }
        this.ufo.view.destroy()
        this.ufo = null
        this.ufoTimer = 1500 + Math.random() * 600
        return
      }
    }

    // UFO bullets → ship
    if (!this.ship.invincible && this.shieldTimer <= 0) {
      for (const b of this.ufoBullets) {
        if (circlesOverlap(b.x, b.y, b.radius, this.ship.x, this.ship.y, this.ship.radius)) {
          b.life = 0
          this.lives--
          this.livesText.text = `LIVES  ${'♥ '.repeat(this.lives).trim() || '—'}`
          this.shake = 10
          RetroAudio.die()
          if (this.lives <= 0) this.endGame()
          else                 this.ship.reset(W() / 2, H() / 2)
          return
        }
      }
    }
  }

  private checkPowerUpCollisions() {
    for (const pu of this.powerUps) {
      if (!circlesOverlap(this.ship.x, this.ship.y, this.ship.radius, pu.x, pu.y, pu.radius)) continue
      pu.lifetime = 0   // mark for cleanup
      RetroAudio.collect()

      if (pu.type === 'tripleShot') {
        this.tripleShotTimer = 480
      } else if (pu.type === 'shield') {
        this.shieldTimer = 300
        this.ship.setShield(true)
      } else {
        this.lives = Math.min(this.lives + 1, 5)
        this.livesText.text = `LIVES  ${'♥ '.repeat(this.lives).trim()}`
      }
      this.updatePowerupHUD()
    }
  }

  private updatePowerupHUD() {
    const parts: string[] = []
    if (this.tripleShotTimer > 0) parts.push('» 3-SHOT «')
    if (this.shieldTimer      > 0) parts.push('» SHIELD «')
    this.powerupText.text = parts.join('   ')
  }

  private registerKill(baseScore: number) {
    if (this.comboTimer > 0) this.comboMult = Math.min(this.comboMult + 1, 3)
    this.comboTimer = COMBO_WINDOW
    this.score += baseScore * this.comboMult
    this.scoreText.text = `SCORE\n${String(this.score).padStart(5, '0')}`
    if (this.comboMult > 1) {
      this.comboText.text       = `${this.comboMult}× COMBO`
      this.comboText.style.fill = this.comboMult === 3 ? '#ff6622' : '#ffdd00'
      this.comboText.alpha      = 1
    }
  }

  private triggerHyperspace() {
    this.inHyperspace    = true
    this.hyperspaceTimer = 180   // 3 s cooldown
    this.ship.view.visible = false
    RetroAudio.hyperspaceIn()
    this.updateHyperspaceHUD()

    setTimeout(() => {
      if (this.gameOver) { this.inHyperspace = false; return }

      const MARGIN = 80
      const x = MARGIN + Math.random() * (W() - MARGIN * 2)
      const y = MARGIN + Math.random() * (H() - MARGIN * 2)
      this.inHyperspace = false

      if (Math.random() < 0.15) {
        // fatal exit — explosion at the exit point, lose a life
        const frags = explode(x, y, 0, 0, 'large')
        for (const p of frags) { this.particles.push(p); this.view.addChild(p.view) }
        RetroAudio.die()
        this.shake = 10
        this.lives--
        this.livesText.text = `LIVES  ${'♥ '.repeat(this.lives).trim() || '—'}`
        if (this.lives <= 0) { this.updateHyperspaceHUD(); this.endGame(); return }
        this.ship.reset(W() / 2, H() / 2)
      } else {
        // successful exit — reposition with 1.5 s invincibility
        this.ship.x              = x
        this.ship.y              = y
        this.ship.vx             = 0
        this.ship.vy             = 0
        this.ship.view.x         = x
        this.ship.view.y         = y
        this.ship.view.rotation  = 0
        this.ship.view.visible   = true
        this.ship.invincible     = true
        setTimeout(() => { this.ship.invincible = false }, 1500)
        RetroAudio.hyperspaceOut()
      }
      this.updateHyperspaceHUD()
    }, 300)
  }

  private updateHyperspaceHUD() {
    if (this.inHyperspace) {
      this.hyperspaceText.alpha = 0
    } else if (this.hyperspaceTimer > 0) {
      this.hyperspaceText.text  = 'HYPR COOLING'
      this.hyperspaceText.alpha = 0.2
    } else {
      this.hyperspaceText.text  = '[SHF] HYPR'
      this.hyperspaceText.alpha = 0.35
    }
  }

  private checkAsteroidCollisions() {
    for (let i = 0; i < this.asteroids.length; i++) {
      for (let j = i + 1; j < this.asteroids.length; j++) {
        const a  = this.asteroids[i]
        const b  = this.asteroids[j]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const distSq  = dx * dx + dy * dy
        const minDist = a.radius + b.radius

        if (distSq >= minDist * minDist || distSq === 0) continue

        const dist = Math.sqrt(distSq)
        const nx   = dx / dist
        const ny   = dy / dist

        // Push apart so they don't overlap
        const overlap = minDist - dist
        const ma      = a.radius * a.radius  // mass ∝ area
        const mb      = b.radius * b.radius
        const total   = ma + mb
        a.x -= nx * overlap * (mb / total)
        a.y -= ny * overlap * (mb / total)
        b.x += nx * overlap * (ma / total)
        b.y += ny * overlap * (ma / total)

        // Elastic impulse
        const relVx = a.vx - b.vx
        const relVy = a.vy - b.vy
        const velAlongNormal = relVx * nx + relVy * ny
        if (velAlongNormal > 0) continue   // already separating

        const restitution = 0.85
        const impulse = -(1 + restitution) * velAlongNormal / (1 / ma + 1 / mb)
        a.vx += (impulse / ma) * nx
        a.vy += (impulse / ma) * ny
        b.vx -= (impulse / mb) * nx
        b.vy -= (impulse / mb) * ny
      }
    }
  }

  private checkBulletCollisions() {
    for (const b of this.bullets) {
      for (const a of this.asteroids) {
        if (!a.view.visible) continue
        if (circlesOverlap(b.x, b.y, b.radius, a.x, a.y, a.radius)) {
          b.life = 0
          a.view.visible = false

          this.registerKill(SCORE_MAP[a.size])

          RetroAudio.explode(a.size)
          const frags = explode(a.x, a.y, a.vx, a.vy, a.size)
          for (const p of frags) {
            this.particles.push(p)
            this.view.addChild(p.view)
          }

          const pieces = a.split()
          for (const p of pieces) {
            this.asteroids.push(p)
            this.view.addChild(p.view)
          }

          // maybe drop a power-up
          if (Math.random() < (DROP_CHANCE[a.size] ?? 0)) {
            const pu = new PowerUp(randomType(), a.x, a.y)
            this.powerUps.push(pu)
            this.view.addChild(pu.view)
          }
          break
        }
      }
    }
  }

  private checkShipCollisions() {
    if (this.ship.invincible || this.shieldTimer > 0) return
    for (const a of this.asteroids) {
      if (!a.view.visible) continue
      if (circlesOverlap(this.ship.x, this.ship.y, this.ship.radius, a.x, a.y, a.radius)) {
        this.lives--
        this.livesText.text = `LIVES  ${'♥ '.repeat(this.lives).trim() || '—'}`

        this.shake = 10
        RetroAudio.die()
        if (this.lives <= 0) this.endGame()
        else                 this.ship.reset(W() / 2, H() / 2)
        break
      }
    }
  }

  private cleanup() {
    this.bullets.filter(b => b.dead).forEach(b => b.view.destroy())
    this.bullets = this.bullets.filter(b => !b.dead)

    this.asteroids.filter(a => !a.view.visible).forEach(a => a.view.destroy())
    this.asteroids = this.asteroids.filter(a => a.view.visible)

    this.particles.filter(p => p.dead).forEach(p => p.view.destroy())
    this.particles = this.particles.filter(p => !p.dead)

    this.ufoBullets.filter(b => b.dead).forEach(b => b.view.destroy())
    this.ufoBullets = this.ufoBullets.filter(b => !b.dead)

    this.powerUps.filter(p => p.expired).forEach(p => p.view.destroy())
    this.powerUps = this.powerUps.filter(p => !p.expired)
  }

  private endGame() {
    this.gameOver          = true
    this.ship.view.visible = false
    this.msgText.text      = `GAME OVER`

    // brief pause so the player sees what killed them, then hand off to React
    setTimeout(() => this.onGameOver?.(this.score), 600)
  }

  destroy() {
    this._removeInput()
    RetroAudio.stopThrust()
    if (this.ufo) { this.ufo.view.destroy(); this.ufo = null }
    this.view.destroy({ children: true })
  }
}
