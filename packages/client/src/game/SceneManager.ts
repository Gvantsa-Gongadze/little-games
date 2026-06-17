import { Application, Container } from 'pixi.js'

export interface Scene {
  view: Container
  update(delta: number): void
  destroy(): void
}

export class SceneManager {
  private current: Scene | null = null

  constructor(private app: Application) {}

  switch(scene: Scene) {
    if (this.current) {
      this.current.destroy()
      this.app.stage.removeChildren()
    }
    this.current = scene
    this.app.stage.addChild(scene.view)
  }

  update(delta: number) {
    this.current?.update(delta)
  }
}
