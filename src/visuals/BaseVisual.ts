import * as THREE from 'three'
import type { LayerConfig, MidiBinding } from '../presets/types'
import { bus } from '../signals/SignalBus'

// IMPORTANT: any field assigned inside setup() must use `declare` (not `= x` or `!:`).
// ES2022 native class fields initialize AFTER super() returns, so an initializer
// like `mesh!: Foo` emits `mesh = undefined` which silently overwrites setup().
export abstract class BaseVisual {
  readonly id: string
  protected scene: THREE.Scene
  protected objects: THREE.Object3D[] = []
  private unsubs: Array<() => void> = []

  constructor(config: LayerConfig, scene: THREE.Scene) {
    this.id = config.id
    this.scene = scene
    this.setup(config)
    this.bindTrigger(config)
    if (config.midiBindings?.length) this.bindMidiParams(config.midiBindings)
  }

  protected abstract setup(config: LayerConfig): void
  abstract update(delta: number): void

  protected on<T extends Parameters<typeof bus.on>[0]>(
    type: T,
    handler: Parameters<typeof bus.on<T>>[1]
  ): void {
    this.unsubs.push(bus.on(type, handler))
  }

  private bindTrigger(config: LayerConfig): void {
    const { trigger } = config
    if (trigger.source === 'audio') {
      const band = (trigger as Extract<typeof trigger, { source: 'audio' }>).band
      this.on('audio', (p) => this.onSignal(p[band]))
    } else if (trigger.source === 'midi') {
      const t = trigger as Extract<typeof trigger, { source: 'midi' }>
      this.on('midi', (p) => {
        if (p.channel !== t.channel) return
        const matchNote = t.note === undefined || p.note === t.note
        const matchCC   = t.cc   === undefined || p.cc   === t.cc
        if (matchNote || matchCC) this.onSignal(p.value)
      })
    } else if (trigger.source === 'osc') {
      const addr = (trigger as Extract<typeof trigger, { source: 'osc' }>).address
      this.on('osc', (p) => {
        if (p.address === addr) this.onSignal(typeof p.args[0] === 'number' ? p.args[0] : 1)
      })
    } else if (trigger.source === 'clock') {
      const div = (trigger as Extract<typeof trigger, { source: 'clock' }>).division
      this.on('clock', (p) => {
        if (p.division === div) this.onSignal(1)
      })
    }
  }

  protected onSignal(_value: number): void {}

  private bindMidiParams(bindings: MidiBinding[]): void {
    const params = (this as unknown as { params?: Record<string, unknown> }).params
    if (!params) return
    this.on('midi', (p) => {
      if (p.cc === undefined) return
      for (const b of bindings) {
        if (b.cc !== p.cc) continue
        if (b.channel !== undefined && b.channel !== p.channel) continue
        const min = b.min ?? 0
        const max = b.max ?? 1
        params[b.param] = min + p.value * (max - min)
      }
    })
  }

  dispose(): void {
    this.unsubs.forEach(fn => fn())
    this.objects.forEach(obj => {
      this.scene.remove(obj)
      const o = obj as unknown as { geometry?: THREE.BufferGeometry; material?: THREE.Material | THREE.Material[] }
      o.geometry?.dispose()
      if (Array.isArray(o.material)) o.material.forEach(m => m.dispose())
      else o.material?.dispose()
    })
    this.objects = []
  }
}
