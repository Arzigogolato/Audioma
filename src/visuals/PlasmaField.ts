import * as THREE from 'three'
import type { LayerConfig } from '../presets/types'
import { BaseVisual } from './BaseVisual'
import plasmaFrag from './shaders/plasma.frag.glsl'
import baseVert from './shaders/base.vert.glsl'

export interface PlasmaParams {
  speed:      number   // how fast the field evolves
  complexity: number   // FBM octaves [0-1]
  colorShift: number   // palette hue rotation [0-1]
  contrast:   number   // output gamma / punch
  zoom:       number   // field scale
  distortion: number   // domain warp strength
  palette:    number   // blends between two colour sets [0-1]
}

export class PlasmaField extends BaseVisual {
  declare params:  PlasmaParams
  private declare mesh: THREE.Mesh
  private declare mat:  THREE.ShaderMaterial
  private time   = 0
  private frozen = false
  private invert = false

  protected setup(config: LayerConfig): void {
    this.params = {
      speed:      0.4,
      complexity: 0.5,
      colorShift: 0.0,
      contrast:   1.3,
      zoom:       2.0,
      distortion: 4.0,
      palette:    0.0,
    }
    Object.assign(this.params, config.params)

    this.mat = new THREE.ShaderMaterial({
      vertexShader:   baseVert,
      fragmentShader: plasmaFrag,
      uniforms: {
        uTime:       { value: 0 },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uSpeed:      { value: this.params.speed },
        uComplexity: { value: this.params.complexity },
        uColorShift: { value: this.params.colorShift },
        uContrast:   { value: this.params.contrast },
        uZoom:       { value: this.params.zoom },
        uDistortion: { value: this.params.distortion },
        uPalette:    { value: this.params.palette },
        uInvert:     { value: 0.0 },
      },
      depthTest:  false,
      depthWrite: false,
    })

    // Oversized plane — gl_FragCoord makes UVs independent of geometry size
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), this.mat)
    this.mesh.renderOrder = -1
    this.scene.add(this.mesh)
    this.objects.push(this.mesh)

    window.addEventListener('resize', this.onResize)

    // S1 (CC 32): freeze time — S2 (CC 33): invert colours
    this.on('midi', (p) => {
      if (p.cc === 32 && p.value > 0) this.frozen = !this.frozen
      if (p.cc === 33 && p.value > 0) {
        this.invert = !this.invert
        this.mat.uniforms.uInvert.value = this.invert ? 1 : 0
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
    u.uComplexity.value = p.complexity
    u.uColorShift.value = p.colorShift
    u.uContrast.value   = p.contrast
    u.uZoom.value       = p.zoom
    u.uDistortion.value = p.distortion
    u.uPalette.value    = p.palette
  }

  dispose(): void {
    window.removeEventListener('resize', this.onResize)
    super.dispose()
  }
}
