import * as THREE from 'three'
import type { PresetConfig, LayerConfig } from '../presets/types'
import { BaseVisual } from '../visuals/BaseVisual'

type VisualConstructor = new (config: LayerConfig, scene: THREE.Scene) => BaseVisual

const registry = new Map<string, VisualConstructor>()

export function registerVisual(type: string, ctor: VisualConstructor): void {
  registry.set(type, ctor)
}

export class PresetManager {
  private layers: BaseVisual[] = []
  private scene: THREE.Scene

  constructor(scene: THREE.Scene) {
    this.scene = scene
  }

  load(preset: PresetConfig): void {
    this.unload()
    for (const layerConfig of preset.layers) {
      const Ctor = registry.get(layerConfig.type)
      if (!Ctor) {
        console.warn(`[PresetManager] Unknown visual type: "${layerConfig.type}"`)
        continue
      }
      this.layers.push(new Ctor(layerConfig, this.scene))
    }
  }

  async loadFromURL(url: string): Promise<void> {
    const res = await fetch(url)
    const preset: PresetConfig = await res.json()
    this.load(preset)
  }

  update(delta: number): void {
    for (const layer of this.layers) layer.update(delta)
  }

  getLayer(id: string): BaseVisual | undefined {
    return this.layers.find(l => l.id === id)
  }

  unload(): void {
    for (const layer of this.layers) layer.dispose()
    this.layers = []
  }
}
