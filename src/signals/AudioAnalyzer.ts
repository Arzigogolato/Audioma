import { bus } from './SignalBus'

const FFT_SIZE = 2048
const BANDS = {
  bass:     [20,   250],
  mid:      [250,  4000],
  high:     [4000, 12000],
  presence: [12000, 20000],
} as const

export class AudioAnalyzer {
  private context: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private dataArray: Float32Array<ArrayBuffer> | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private frameId = 0

  async start(stream?: MediaStream): Promise<void> {
    this.context = new AudioContext()
    this.analyser = this.context.createAnalyser()
    this.analyser.fftSize = FFT_SIZE
    this.analyser.smoothingTimeConstant = 0.85
    this.dataArray = new Float32Array(this.analyser.frequencyBinCount)

    if (stream) {
      this.source = this.context.createMediaStreamSource(stream)
      this.source.connect(this.analyser)
    }

    this.tick()
  }

  async startMic(): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    await this.start(stream)
  }

  connectNode(node: AudioNode): void {
    if (!this.analyser) return
    node.connect(this.analyser)
  }

  private getContext(): AudioContext {
    if (!this.context) throw new Error('AudioAnalyzer not started')
    return this.context
  }

  private bandRMS(band: keyof typeof BANDS): number {
    if (!this.analyser || !this.dataArray) return 0
    const [lo, hi] = BANDS[band]
    const nyquist = this.getContext().sampleRate / 2
    const binCount = this.analyser.frequencyBinCount
    const loIdx = Math.floor((lo / nyquist) * binCount)
    const hiIdx = Math.ceil((hi / nyquist) * binCount)
    let sum = 0
    for (let i = loIdx; i <= hiIdx; i++) {
      const lin = Math.pow(10, this.dataArray[i] / 20)
      sum += lin * lin
    }
    return Math.sqrt(sum / (hiIdx - loIdx + 1))
  }

  private tick = (): void => {
    this.frameId = requestAnimationFrame(this.tick)
    if (!this.analyser || !this.dataArray) return
    this.analyser.getFloatFrequencyData(this.dataArray)

    bus.emit('audio', {
      bass:     this.bandRMS('bass'),
      mid:      this.bandRMS('mid'),
      high:     this.bandRMS('high'),
      presence: this.bandRMS('presence'),
      raw:      this.dataArray.slice(0),
    })
  }

  stop(): void {
    cancelAnimationFrame(this.frameId)
    this.source?.disconnect()
    this.context?.close()
  }
}
