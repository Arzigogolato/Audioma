import { bus } from '../signals/SignalBus'

export class Clock {
  private bpm = 120
  private intervalId: ReturnType<typeof setInterval> | null = null
  private beat = 0

  start(bpm = 120): void {
    this.bpm = bpm
    this.beat = 0
    const interval = (60 / bpm / 4) * 1000 // sixteenth note resolution

    this.intervalId = setInterval(() => {
      this.beat++
      const division = this.beat % 4 === 0 ? 1 : this.beat % 2 === 0 ? 0.5 : 0.25
      bus.emit('clock', { beat: this.beat, division, bpm: this.bpm })
    }, interval)
  }

  setBPM(bpm: number): void {
    this.bpm = bpm
    if (this.intervalId !== null) {
      this.stop()
      this.start(bpm)
    }
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }
}
