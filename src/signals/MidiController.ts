import { bus } from './SignalBus'

export class MidiController {
  private access: MIDIAccess | null = null

  async start(): Promise<void> {
    if (!navigator.requestMIDIAccess) {
      console.warn('Web MIDI API not supported in this browser')
      return
    }
    this.access = await navigator.requestMIDIAccess({ sysex: false })
    this.access.inputs.forEach(input => this.bindInput(input))
    this.access.onstatechange = (e) => {
      const port = e.port
      if (port && port.type === 'input' && port.state === 'connected') {
        this.bindInput(port as MIDIInput)
      }
    }
  }

  private bindInput(input: MIDIInput): void {
    input.onmidimessage = (e) => {
      const [status, data1, data2] = e.data!
      const type = status & 0xf0
      const channel = (status & 0x0f) + 1

      if (type === 0x90 && data2 > 0) {
        // note on
        bus.emit('midi', { channel, note: data1, value: data2 / 127 })
      } else if (type === 0x80 || (type === 0x90 && data2 === 0)) {
        // note off
        bus.emit('midi', { channel, note: data1, value: 0 })
      } else if (type === 0xb0) {
        // control change
        bus.emit('midi', { channel, cc: data1, value: data2 / 127 })
      }
    }
  }

  getInputs(): MIDIInput[] {
    if (!this.access) return []
    return Array.from(this.access.inputs.values())
  }
}
