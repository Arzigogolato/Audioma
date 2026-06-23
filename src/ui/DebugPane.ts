import { Pane } from 'tweakpane'
import type { AudioAnalyzer } from '../signals/AudioAnalyzer'
import type { Clock } from '../engine/Clock'
import { bus } from '../signals/SignalBus'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFolder = any

type ParamRanges = Record<string, { min?: number; max?: number; step?: number }>

export class DebugPane {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private pane: any
  private state     = { bass: 0, mid: 0, high: 0, presence: 0, bpm: 120 }
  private midiState = { ch: 0, cc: '-', value: 0 }

  constructor(
    clock: Clock,
    audio: AudioAnalyzer,
    onSelect: (visual: string) => void,
  ) {
    this.pane = new Pane({ title: 'Audioma' })

    // ── visual selector ──────────────────────────────────────────────────────
    const sel = this.pane.addFolder({ title: 'Visual', expanded: true })
    sel.addButton({ title: '① Plasma' })    .on('click', () => onSelect('plasma'))
    sel.addButton({ title: '② Particles' }) .on('click', () => onSelect('particles'))
    sel.addButton({ title: '③ Raymarching' }).on('click', () => onSelect('raymarching'))
    sel.addButton({ title: '④ Chladni' })   .on('click', () => onSelect('chladni'))

    // ── MIDI monitor ─────────────────────────────────────────────────────────
    const midi = this.pane.addFolder({ title: 'MIDI', expanded: true })
    midi.addMonitor(this.midiState, 'ch',    { label: 'channel' })
    midi.addMonitor(this.midiState, 'cc',    { label: 'CC / note' })
    midi.addMonitor(this.midiState, 'value', { label: 'value', min: 0, max: 1 })

    bus.on('midi', (p) => {
      this.midiState.ch    = p.channel
      this.midiState.cc    = p.cc !== undefined ? `CC ${p.cc}` : `N ${p.note}`
      this.midiState.value = p.value
    })

    // ── audio ─────────────────────────────────────────────────────────────────
    const aud = this.pane.addFolder({ title: 'Audio', expanded: false })
    aud.addMonitor(this.state, 'bass',     { min: 0, max: 1 })
    aud.addMonitor(this.state, 'mid',      { min: 0, max: 1 })
    aud.addMonitor(this.state, 'high',     { min: 0, max: 1 })
    aud.addMonitor(this.state, 'presence', { min: 0, max: 1 })

    // ── clock ─────────────────────────────────────────────────────────────────
    const clk = this.pane.addFolder({ title: 'Clock', expanded: false })
    clk.addInput(this.state, 'bpm', { min: 60, max: 240, step: 1 })
       .on('change', ({ value }: { value: number }) => clock.setBPM(value))

    // ── actions ───────────────────────────────────────────────────────────────
    const act = this.pane.addFolder({ title: 'Actions', expanded: false })
    act.addButton({ title: 'Start Mic' }).on('click', () => audio.startMic())
  }

  // Returns the folder so the caller can dispose it when switching visuals
  addVisualParams(
    title:   string,
    params:  Record<string, unknown>,
    ranges:  ParamRanges = {},
    exclude: string[]    = [],
  ): AnyFolder {
    const folder = this.pane.addFolder({ title, expanded: true })
    for (const key of Object.keys(params)) {
      if (exclude.includes(key)) continue
      const val = params[key]
      if (typeof val === 'number') {
        folder.addInput(params, key, ranges[key] ?? { min: -5, max: 5, step: 0.01 })
      } else if (typeof val === 'string' && val.startsWith('#')) {
        folder.addInput(params, key)
      }
    }
    return folder
  }

  updateAudio(bass: number, mid: number, high: number, presence: number): void {
    this.state.bass     = bass
    this.state.mid      = mid
    this.state.high     = high
    this.state.presence = presence
  }

  dispose(): void { this.pane.dispose() }
}
