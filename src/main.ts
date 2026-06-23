import { Renderer } from './engine/Renderer'
import { PresetManager, registerVisual } from './engine/PresetManager'
import { Clock } from './engine/Clock'
import { AudioAnalyzer } from './signals/AudioAnalyzer'
import { MidiController } from './signals/MidiController'
import { DebugPane } from './ui/DebugPane'
import { bus } from './signals/SignalBus'
import { NeonCube } from './visuals/NeonCube'
import { PlasmaField } from './visuals/PlasmaField'
import { ParticleField } from './visuals/ParticleField'
import { Raymarcher }    from './visuals/Raymarcher'
import { Chladni }       from './visuals/Chladni'
import type { PresetConfig } from './presets/types'
import plasmaCfg       from './presets/song1.json'
import particlesCfg    from './presets/visual-particles.json'
import raymarchingCfg  from './presets/visual-raymarching.json'
import chladniCfg      from './presets/visual-chladni.json'

// ── register visual types ─────────────────────────────────────────────────────
registerVisual('NeonCube',      NeonCube)
registerVisual('PlasmaField',   PlasmaField)
registerVisual('ParticleField', ParticleField)
registerVisual('Raymarcher',    Raymarcher)
registerVisual('Chladni',       Chladni)

// ── bootstrap ─────────────────────────────────────────────────────────────────
const renderer = new Renderer()
const presets  = new PresetManager(renderer.scene)
const clock    = new Clock()
const audio    = new AudioAnalyzer()
const midi     = new MidiController()

midi.start().catch(console.warn)
clock.start(120)

// ── visual switcher ───────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let paramsFolder: any = null

function loadVisual(type: string): void {
  paramsFolder?.dispose()
  paramsFolder = null

  if (type === 'plasma') {
    presets.load(plasmaCfg as PresetConfig)
    const layer = presets.getLayer('plasma') as PlasmaField
    paramsFolder = debug.addVisualParams(
      'Plasma',
      layer.params as unknown as Record<string, unknown>,
      {
        speed:      { min: 0,   max: 1.5, step: 0.01 },
        complexity: { min: 0,   max: 1,   step: 0.01 },
        colorShift: { min: 0,   max: 1,   step: 0.01 },
        palette:    { min: 0,   max: 1,   step: 0.01 },
        zoom:       { min: 0.5, max: 6,   step: 0.01 },
        distortion: { min: 0,   max: 10,  step: 0.01 },
        contrast:   { min: 0.5, max: 3,   step: 0.01 },
      },
    )
  }

  if (type === 'particles') {
    presets.load(particlesCfg as PresetConfig)
    const layer = presets.getLayer('particles') as ParticleField
    paramsFolder = debug.addVisualParams(
      'Particles',
      layer.params as unknown as Record<string, unknown>,
      {
        speed:         { min: 0,   max: 3, step: 0.01 },
        fieldStrength: { min: 0,   max: 3, step: 0.01 },
        spread:        { min: 0.3, max: 5, step: 0.01 },
        lifespan:      { min: 0.5, max: 8, step: 0.01 },
        size:          { min: 0.3, max: 4, step: 0.01 },
        colorShift:    { min: 0,   max: 1, step: 0.01 },
        palette:       { min: 0,   max: 1, step: 0.01 },
      },
      ['count'], // count is init-only
    )
  }

  if (type === 'raymarching') {
    presets.load(raymarchingCfg as PresetConfig)
    const layer = presets.getLayer('raymarching') as Raymarcher
    paramsFolder = debug.addVisualParams(
      'Raymarcher',
      layer.params as unknown as Record<string, unknown>,
      {
        speed:      { min: 0,   max: 2,   step: 0.01 },
        morph:      { min: 0,   max: 1,   step: 0.01 },
        colorShift: { min: 0,   max: 1,   step: 0.01 },
        palette:    { min: 0,   max: 1,   step: 0.01 },
        glow:       { min: 0,   max: 3,   step: 0.01 },
        repeat:     { min: 0,   max: 2,   step: 0.01 },
        zoom:       { min: 0.5, max: 2.5, step: 0.01 },
      },
    )
  }

  if (type === 'chladni') {
    presets.load(chladniCfg as PresetConfig)
    const layer = presets.getLayer('chladni') as Chladni
    paramsFolder = debug.addVisualParams(
      'Chladni',
      layer.params as unknown as Record<string, unknown>,
      {
        speed:      { min: 0,   max: 1.5, step: 0.01 },
        modeX:      { min: 1,   max: 9,   step: 0.1  },
        modeY:      { min: 1,   max: 9,   step: 0.1  },
        sharpness:  { min: 0.1, max: 2.5, step: 0.01 },
        symmetry:   { min: 0,   max: 1,   step: 0.01 },
        phase:      { min: 0,   max: 1,   step: 0.01 },
        colorShift: { min: 0,   max: 1,   step: 0.01 },
        palette:    { min: 0,   max: 1,   step: 0.01 },
      },
    )
  }
}

// ── debug pane (needs loadVisual) ─────────────────────────────────────────────
const debug = new DebugPane(clock, audio, loadVisual)
bus.on('audio', (p) => debug.updateAudio(p.bass, p.mid, p.high, p.presence))

// ── start with plasma ─────────────────────────────────────────────────────────
loadVisual('plasma')

// ── render loop ───────────────────────────────────────────────────────────────
let last = performance.now()

function loop(): void {
  requestAnimationFrame(loop)
  const now   = performance.now()
  const delta = (now - last) / 1000
  last = now
  presets.update(delta)
  renderer.render()
}

loop()

Object.assign(window, { renderer, presets, clock, audio, midi, bus, loadVisual })
