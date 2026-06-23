import * as THREE from 'three'
import type { LayerConfig } from '../presets/types'
import { BaseVisual } from './BaseVisual'
import particlesVert from './shaders/particles.vert.glsl'
import particlesFrag from './shaders/particles.frag.glsl'

export interface ParticleParams {
  count:         number   // allocated at init — not live
  speed:         number
  fieldStrength: number
  spread:        number
  lifespan:      number
  size:          number
  colorShift:    number
  palette:       number
}

export class ParticleField extends BaseVisual {
  declare params:  ParticleParams
  private declare points: THREE.Points
  private declare mat:    THREE.ShaderMaterial
  private declare geo:    THREE.BufferGeometry

  // CPU simulation — declare (not !:) so setup() values aren't overwritten
  private declare px:      Float32Array
  private declare py:      Float32Array
  private declare vx:      Float32Array
  private declare vy:      Float32Array
  private declare life:    Float32Array
  private declare maxLife: Float32Array

  private time          = 0
  private burstPending  = false

  protected setup(config: LayerConfig): void {
    this.params = {
      count:         40000,
      speed:         0.6,
      fieldStrength: 1.0,
      spread:        2.0,
      lifespan:      3.5,
      size:          1.0,
      colorShift:    0.0,
      palette:       0.0,
    }
    Object.assign(this.params, config.params)

    const N = this.params.count

    this.px      = new Float32Array(N)
    this.py      = new Float32Array(N)
    this.vx      = new Float32Array(N)
    this.vy      = new Float32Array(N)
    this.life    = new Float32Array(N)
    this.maxLife = new Float32Array(N)

    for (let i = 0; i < N; i++) this.spawnParticle(i, true)

    const positions  = new Float32Array(N * 3)
    const lifeAttr   = new Float32Array(N)
    const speedAttr  = new Float32Array(N)

    this.geo = new THREE.BufferGeometry()
    this.geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.geo.setAttribute('aLife',    new THREE.BufferAttribute(lifeAttr,  1))
    this.geo.setAttribute('aSpeed',   new THREE.BufferAttribute(speedAttr, 1))

    this.mat = new THREE.ShaderMaterial({
      vertexShader:   particlesVert,
      fragmentShader: particlesFrag,
      uniforms: {
        uSize:       { value: this.params.size },
        uColorShift: { value: this.params.colorShift },
        uPalette:    { value: this.params.palette },
      },
      transparent: true,
      blending:    THREE.AdditiveBlending,
      depthWrite:  false,
    })

    this.points = new THREE.Points(this.geo, this.mat)
    this.scene.add(this.points)
    this.objects.push(this.points)

    // S1 (CC 32): burst — S2 (CC 33): scatter reset
    this.on('midi', (p) => {
      if (p.cc === 32 && p.value > 0) this.burstPending = true
      if (p.cc === 33 && p.value > 0) {
        for (let i = 0; i < this.params.count; i++) this.spawnParticle(i, true)
      }
    })
  }

  private spawnParticle(i: number, randomAge = false): void {
    const angle = Math.random() * Math.PI * 2
    const r = (0.05 + Math.pow(Math.random(), 0.6)) * this.params.spread
    this.px[i]      = Math.cos(angle) * r
    this.py[i]      = Math.sin(angle) * r
    this.vx[i]      = (Math.random() - 0.5) * 0.03
    this.vy[i]      = (Math.random() - 0.5) * 0.03
    this.maxLife[i] = this.params.lifespan * (0.4 + Math.random() * 0.6)
    this.life[i]    = randomAge ? Math.random() * this.maxLife[i] : this.maxLife[i]
  }

  update(delta: number): void {
    this.time += delta
    const p  = this.params
    const N  = p.count
    const dt = Math.min(delta, 0.05)
    const t  = this.time

    // burst: explode all particles outward radially
    if (this.burstPending) {
      for (let i = 0; i < N; i++) {
        const a = Math.random() * Math.PI * 2
        const s = 3 + Math.random() * 5
        this.vx[i] += Math.cos(a) * s
        this.vy[i] += Math.sin(a) * s
      }
      this.burstPending = false
    }

    const posArr  = (this.geo.getAttribute('position') as THREE.BufferAttribute).array as Float32Array
    const lifArr  = (this.geo.getAttribute('aLife')    as THREE.BufferAttribute).array as Float32Array
    const spdArr  = (this.geo.getAttribute('aSpeed')   as THREE.BufferAttribute).array as Float32Array

    for (let i = 0; i < N; i++) {
      this.life[i] -= dt
      if (this.life[i] <= 0) { this.spawnParticle(i); continue }

      const x = this.px[i], y = this.py[i]
      const r = Math.sqrt(x * x + y * y) + 0.01

      // tangential vortex force — stronger near centre
      const vortex = p.fieldStrength * p.speed / (r + 0.4)
      this.vx[i] += (-y / r) * vortex * dt
      this.vy[i] += ( x / r) * vortex * dt

      // noise perturbation for organic variation
      this.vx[i] += Math.sin(x * 1.4 + t * 0.6) * Math.cos(y * 1.1 + t * 0.4) * 0.12 * p.fieldStrength * dt
      this.vy[i] += Math.cos(x * 0.9 - t * 0.5) * Math.sin(y * 1.7 + t * 0.3) * 0.12 * p.fieldStrength * dt

      // gentle pull toward origin to keep particles on screen
      this.vx[i] -= x * 0.02 * dt
      this.vy[i] -= y * 0.02 * dt

      this.vx[i] *= 0.97
      this.vy[i] *= 0.97

      this.px[i] += this.vx[i] * dt * p.speed
      this.py[i] += this.vy[i] * dt * p.speed

      const spd = Math.min(Math.sqrt(this.vx[i] ** 2 + this.vy[i] ** 2), 1)
      const normalLife = this.life[i] / this.maxLife[i]

      const idx = i * 3
      posArr[idx]     = this.px[i]
      posArr[idx + 1] = this.py[i]
      posArr[idx + 2] = 0
      lifArr[i] = normalLife
      spdArr[i] = spd
    }

    ;(this.geo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true
    ;(this.geo.getAttribute('aLife')    as THREE.BufferAttribute).needsUpdate = true
    ;(this.geo.getAttribute('aSpeed')   as THREE.BufferAttribute).needsUpdate = true

    const u = this.mat.uniforms
    u.uSize.value       = p.size
    u.uColorShift.value = p.colorShift
    u.uPalette.value    = p.palette
  }

  dispose(): void {
    this.geo.dispose()
    super.dispose()
  }
}
