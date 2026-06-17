import { Container, Text } from 'pixi.js'
import type { Scene } from '../SceneManager'

export class MenuScene implements Scene {
  readonly view = new Container()

  constructor(onStart: () => void) {
    const label = new Text({
      text: 'Press SPACE to play',
      style: { fill: '#ffffff', fontSize: 24 },
    })
    label.anchor.set(0.5)
    label.x = window.innerWidth / 2
    label.y = window.innerHeight / 2
    this.view.addChild(label)

    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        window.removeEventListener('keydown', onKey)
        onStart()
      }
    }
    window.addEventListener('keydown', onKey)
  }

  update(_delta: number) {}

  destroy() {
    this.view.destroy()
  }
}
