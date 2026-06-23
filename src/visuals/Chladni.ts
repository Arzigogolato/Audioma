import * as THREE from 'three'
import type { LayerConfig } from '../presets/types'
import { BaseVisual } from './BaseVisual'
import baseVert    from './shaders/base.vert.glsl'
import chladniFrag from './shaders/chladni.frag.glsl'

export interface ChladniParams {
  speed:      number   // animation speed
  modeX:      number   // m — horizontal mode number (2–8)
  modeY:      number   // n — vertical mode number (2–8)
  sharpness:  number   // nodal-line thickness
  symmetry:   number   // 0 = antisymmetric, 1 = symmetric
  phase:      number   // breathing / phase animation amount
  colorShift: number
  palette:    number
}

export class Chladni extends BaseVisual {
  declare params: ChladniParams
  private declare mesh: THREE.Mesh
  private declare mat:  THREE.ShaderMaterial

  private time   = 0
  private frozen = false
  private invert = false
  private locked = false   // S1: snap modes to nearest integer

  protected setup(config: LayerConfig): void {
    this.params = {
      speed:      0.3,
      modeX:      3.0,
      modeY:      4.0,
      sharpness:  1.0,
      symmetry:   0.0,
      phase:      0.5,
      colorShift: 0.0,
      palette:    0.0,
    }
    Object.assign(this.params, config.params)

    this.mat = new THREE.ShaderMaterial({
      vertexShader:   baseVert,
      fragmentShader: chladniFrag,
      uniforms: {
        uTime:       { value: 0 },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uSpeed:      { value: this.params.speed },
        uModeX:      { value: this.params.modeX },
        uModeY:      { value: this.params.modeY },
        uSharpness:  { value: this.params.sharpness },
        uColorShift: { value: this.params.colorShift },
        uPalette:    { value: this.params.palette },
        uSymmetry:   { value: this.params.symmetry },
        uPhase:      { value: this.params.phase },
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

    // S1 (CC 32): lock to nearest integer mode (clean classic Chladni)
    // S2 (CC 33): invert
    this.on('midi', (p) => {
      if (p.cc === 32 && p.value > 0) {
        this.locked = !this.locked
        if (this.locked) {
          this.params.modeX = Math.round(this.params.modeX)
          this.params.modeY = Math.round(this.params.modeY)
        }
      }
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

    u.uTime.value      = this.time
    u.uSpeed.value     = p.speed
    // When locked, pass integer-snapped modes to prevent drift animation
    u.uModeX.value     = this.locked ? Math.round(p.modeX) : p.modeX
    u.uModeY.value     = this.locked ? Math.round(p.modeY) : p.modeY
    u.uSharpness.value = p.sharpness
    u.uColorShift.value = p.colorShift
    u.uPalette.value   = p.palette
    u.uSymmetry.value  = p.symmetry
    u.uPhase.value     = p.phase
  }

  dispose(): void {
    window.removeEventListener('resize', this.onResize)
    super.dispose()
  }
}
