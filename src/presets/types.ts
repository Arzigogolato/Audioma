export type SignalSource = 'midi' | 'audio' | 'osc' | 'clock'

export interface MidiTrigger {
  source: 'midi'
  channel: number
  note?: number
  cc?: number
}

export interface AudioTrigger {
  source: 'audio'
  band: 'bass' | 'mid' | 'high' | 'presence'
}

export interface OscTrigger {
  source: 'osc'
  address: string
}

export interface ClockTrigger {
  source: 'clock'
  division: number // 1 = quarter note, 2 = eighth, 0.5 = half, etc.
}

export type Trigger = MidiTrigger | AudioTrigger | OscTrigger | ClockTrigger

export interface MidiBinding {
  cc: number
  param: string
  min?: number   // default 0
  max?: number   // default 1
  channel?: number  // default: any channel
}

export interface LayerConfig {
  id: string
  type: string            // maps to a registered visual class
  trigger: Trigger
  params: Record<string, unknown>
  midiBindings?: MidiBinding[]
  blendMode?: THREE_BlendingMode
}

type THREE_BlendingMode =
  | 'Normal'
  | 'Additive'
  | 'Subtractive'
  | 'Multiply'
  | 'Screen'

export interface PresetConfig {
  id: string
  name: string
  bpm?: number
  layers: LayerConfig[]
}
