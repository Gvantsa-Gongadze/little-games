import {
  Scene,
  PerspectiveCamera,
  BoxGeometry,
  MeshStandardMaterial,
  Mesh,
  AmbientLight,
  DirectionalLight,
} from 'three'

export class CubeScene {
  readonly scene = new Scene()
  readonly camera: PerspectiveCamera
  private cube: Mesh

  constructor(width: number, height: number) {
    this.camera = new PerspectiveCamera(75, width / height, 0.1, 1000)
    this.camera.position.z = 3

    const ambient = new AmbientLight(0xffffff, 0.5)
    const dirLight = new DirectionalLight(0xffffff, 1)
    dirLight.position.set(5, 5, 5)

    const geometry = new BoxGeometry(1, 1, 1)
    const material = new MeshStandardMaterial({ color: 0x00ff99 })
    this.cube = new Mesh(geometry, material)

    this.scene.add(ambient, dirLight, this.cube)
  }

  update(delta: number) {
    this.cube.rotation.x += 0.01 * delta
    this.cube.rotation.y += 0.01 * delta
  }

  dispose() {
    this.cube.geometry.dispose()
    ;(this.cube.material as MeshStandardMaterial).dispose()
  }
}