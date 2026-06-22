import { Container, Text } from 'pixi.js'
import type { Scene } from '../SceneManager'
import { Ship }     from '../entities/Ship'
import { Bullet }   from '../entities/Bullet'
import { Asteroid } from '../entities/Asteroid'
import { wrap, circlesOverlap, randomEdgePosition } from '../utils/math'

const W = () => window.innerWidth
const H = () => window.innerHeight

const SCORE_MAP = { large: 20, medium: 50, small: 100 }
const FIRE_COOLDOWN = 12

export class AsteroidsScene implements Scene {
  view = new Container()

  private ship:      Ship
  private bullets:   Bullet[]   = []
  private asteroids: Asteroid[] = []
  private keys       = new Set<string>()
  private score      = 0
  private lives      = 3
  private wave       = 0
  private fireTimer  = 0
  private gameOver   = false
  private onGameOver?: (score: number) => void

  private scoreText: Text
  private livesText: Text
  private msgText:   Text

  constructor(onGameOver?: (score: number) => void) {
    this.onGameOver = onGameOver

    // HUD
    this.scoreText = new Text({ text: 'Score: 0',  style: { fill: '#fff', fontSize: 20, fontFamily: 'monospace' } })
    this.livesText = new Text({ text: 'Lives: 3',  style: { fill: '#fff', fontSize: 20, fontFamily: 'monospace' } })
    this.msgText   = new Text({ text: '',          style: { fill: '#fff', fontSize: 28, fontFamily: 'monospace', align: 'center' } })

    this.scoreText.position.set(20, 20)
    this.livesText.position.set(20, 48)

    this.ship = new Ship()
    this.ship.reset(W() / 2, H() / 2)
    this.view.addChild(this.ship.view, this.scoreText, this.livesText, this.msgText)

    this.spawnWave()
    this.setupInput()
  }

  private setupInput() {
    const down = (e: KeyboardEvent) => this.keys.add(e.code)
    const up   = (e: KeyboardEvent) => this.keys.delete(e.code)
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
    const count = 2 + this.wave
    for (let i = 0; i < count; i++) {
      const pos = randomEdgePosition(W(), H())
      const ast = new Asteroid('large', pos.x, pos.y)
      this.asteroids.push(ast)
      this.view.addChild(ast.view)
    }
  }

  update(delta: number) {
    if (this.gameOver) return

    // Ship
    this.ship.update(delta, this.keys)
    wrap(this.ship, W(), H())

    // Shoot
    this.fireTimer -= delta
    if (this.keys.has('Space') && this.fireTimer <= 0) {
      this.fireTimer = FIRE_COOLDOWN
      const b = new Bullet(this.ship.x, this.ship.y, this.ship.view.rotation)
      this.bullets.push(b)
      this.view.addChild(b.view)
    }

    // Bullets
    for (const b of this.bullets) {
      b.update(delta)
      wrap(b, W(), H())
    }

    // Asteroids
    for (const a of this.asteroids) {
      a.update(delta)
      wrap(a, W(), H())
    }

    this.checkBulletCollisions()
    this.checkShipCollisions()
    this.cleanup()

    if (this.asteroids.length === 0) this.spawnWave()
  }

  private checkBulletCollisions() {
    for (const b of this.bullets) {
      for (const a of this.asteroids) {
        if (circlesOverlap(b.x, b.y, b.radius, a.x, a.y, a.radius)) {
          b.life = 0
          a.view.visible = false

          this.score += SCORE_MAP[a.size]
          this.scoreText.text = `Score: ${this.score}`

          const pieces = a.split()
          for (const p of pieces) {
            this.asteroids.push(p)
            this.view.addChild(p.view)
          }
          break
        }
      }
    }
  }

  private checkShipCollisions() {
    if (this.ship.invincible) return

    for (const a of this.asteroids) {
      if (circlesOverlap(this.ship.x, this.ship.y, this.ship.radius, a.x, a.y, a.radius)) {
        this.lives--
        this.livesText.text = `Lives: ${this.lives}`

        if (this.lives <= 0) {
          this.endGame()
        } else {
          this.ship.reset(W() / 2, H() / 2)
        }
        break
      }
    }
  }

  private cleanup() {
    const deadBullets = this.bullets.filter(b => b.dead)
    deadBullets.forEach(b => { b.view.destroy(); })
    this.bullets = this.bullets.filter(b => !b.dead)

    const deadAsteroids = this.asteroids.filter(a => !a.view.visible)
    deadAsteroids.forEach(a => { a.view.destroy() })
    this.asteroids = this.asteroids.filter(a => a.view.visible)
  }

  private endGame() {
    this.gameOver = true
    this.ship.view.visible = false
    this.msgText.text = `GAME OVER\nScore: ${this.score}\n\nPress R to restart`
    this.msgText.x = W() / 2 - this.msgText.width / 2
    this.msgText.y = H() / 2 - this.msgText.height / 2

    const restart = (e: KeyboardEvent) => {
      if (e.code === 'KeyR') {
        window.removeEventListener('keydown', restart)
        this.onGameOver?.(this.score)
      }
    }
    window.addEventListener('keydown', restart)
  }

  destroy() {
    this._removeInput()
    this.view.destroy({ children: true })
  }
}
