import * as THREE from 'three'
import type { LayerConfig } from '../presets/types'
import { BaseVisual } from './BaseVisual'

export interface NeonCubeParams {
  color: string
  rotSpeedX: number
  rotSpeedY: number
  rotSpeedZ: number
  floatSpeed: number
  floatAmp: number
  scale: number
  signalReactivity: number
}

export class NeonCube extends BaseVisual {
  declare params: NeonCubeParams        // no runtime emission — set inside setup()
  private declare mesh: THREE.LineSegments  // idem
  private time = 0
  private signalValue = 0

  protected setup(config: LayerConfig): void {
    this.params = {
      color: '#00ffcc',
      rotSpeedX: 0.3,
      rotSpeedY: 0.7,
      rotSpeedZ: 0.1,
      floatSpeed: 0.5,
      floatAmp: 0.15,
      scale: 0.6,
      signalReactivity: 0.4,
    }
    Object.assign(this.params, config.params)

    const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1))
    const mat = new THREE.LineBasicMaterial({
      color: new THREE.Color(this.params.color),
    })
    this.mesh = new THREE.LineSegments(geo, mat)
    this.scene.add(this.mesh)
    this.objects.push(this.mesh)
  }

  update(delta: number): void {
    this.time += delta
    const p = this.params
    const boost = 1 + this.signalValue * p.signalReactivity

    this.mesh.rotation.x += p.rotSpeedX * delta
    this.mesh.rotation.y += p.rotSpeedY * delta
    this.mesh.rotation.z += p.rotSpeedZ * delta

    // golden-ratio offset between x/y float for organic movement
    this.mesh.position.y = Math.sin(this.time * p.floatSpeed) * p.floatAmp
    this.mesh.position.x = Math.sin(this.time * p.floatSpeed * 0.618) * p.floatAmp * 0.6

    this.mesh.scale.setScalar(p.scale * boost)
    ;(this.mesh.material as THREE.LineBasicMaterial).color.set(p.color)

    this.signalValue *= 0.88  // decay
  }

  protected onSignal(value: number): void {
    if (value > this.signalValue) this.signalValue = value
  }
}
