import { Container, Graphics } from 'pixi.js'
import { Keyboard } from '../input/Keyboard'
import type { Scene } from '../SceneManager'

const SPEED = 4

export class GameScene implements Scene {
  readonly view = new Container()
  private player: Graphics
  constructor(_onGameOver?: (score: number) => void) {
    this.player = new Graphics()
      .rect(0, 0, 40, 40)
      .fill('#00ff99')

    this.player.x = window.innerWidth / 2
    this.player.y = window.innerHeight / 2
    this.view.addChild(this.player)
  }

  update(delta: number) {
    if (Keyboard.isDown('ArrowLeft'))  this.player.x -= SPEED * delta
    if (Keyboard.isDown('ArrowRight')) this.player.x += SPEED * delta
    if (Keyboard.isDown('ArrowUp'))    this.player.y -= SPEED * delta
    if (Keyboard.isDown('ArrowDown'))  this.player.y += SPEED * delta
  }

  destroy() {
    this.view.destroy()
  }
}
