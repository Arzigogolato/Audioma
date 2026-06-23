import * as THREE from 'three'
import type { LayerConfig } from '../presets/types'
import { BaseVisual } from './BaseVisual'
import baseVert     from './shaders/base.vert.glsl'
import raymarchFrag from './shaders/raymarching.frag.glsl'

export interface RaymarchParams {
  speed:      number
  morph:      number
  colorShift: number
  palette:    number
  glow:       number
  repeat:     number
  zoom:       number
}

export class Raymarcher extends BaseVisual {
  declare params: RaymarchParams
  private declare mesh: THREE.Mesh
  private declare mat:  THREE.ShaderMaterial

  private time   = 0
  private frozen = false
  private invert = false

  protected setup(config: LayerConfig): void {
    this.params = {
      speed:      0.4,
      morph:      0.0,
      colorShift: 0.0,
      palette:    0.0,
      glow:       1.0,
      repeat:     0.0,
      zoom:       1.0,
    }
    Object.assign(this.params, config.params)

    this.mat = new THREE.ShaderMaterial({
      vertexShader:   baseVert,
      fragmentShader: raymarchFrag,
      uniforms: {
        uTime:       { value: 0 },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uSpeed:      { value: this.params.speed },
        uMorph:      { value: this.params.morph },
        uColorShift: { value: this.params.colorShift },
        uPalette:    { value: this.params.palette },
        uGlow:       { value: this.params.glow },
        uRepeat:     { value: this.params.repeat },
        uZoom:       { value: this.params.zoom },
        uInvert:     { value: 0.0 },
      },
      depthTest:  false,
      depthWrite: false,
    })

    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), this.mat)
    this.mesh.renderOrder = -1
    this.scene.add(this.mesh)
    this.objects.push(this.mesh)

    window.addEventListener('resize', this.onResize)

    // S1 (CC 32): freeze camera — S2 (CC 33): invert
    this.on('midi', (p) => {
      if (p.cc === 32 && p.value > 0) this.frozen = !this.frozen
      if (p.cc === 33 && p.value > 0) {
        this.invert = !this.invert
        this.mat.uniforms.uInvert.value = this.invert ? 1.0 : 0.0
      }
    })
  }

  private onResize = (): void => {
    this.mat.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight)
  }

  update(delta: number): void {
    if (!this.frozen) this.time += delta
    const p = this.params
    const u = this.mat.uniforms
    u.uTime.value       = this.time
    u.uSpeed.value      = p.speed
    u.uMorph.value      = p.morph
    u.uColorShift.value = p.colorShift
    u.uPalette.value    = p.palette
    u.uGlow.value       = p.glow
    u.uRepeat.value     = p.repeat
    u.uZoom.value       = p.zoom
  }

  dispose(): void {
    window.removeEventListener('resize', this.onResize)
    super.dispose()
  }
}
