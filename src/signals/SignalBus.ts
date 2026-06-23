export type SignalPayload = {
  midi: { channel: number; note?: number; cc?: number; value: number }
  audio: { bass: number; mid: number; high: number; presence: number; raw: Float32Array<ArrayBuffer> }
  osc: { address: string; args: unknown[] }
  clock: { beat: number; division: number; bpm: number }
}

export type SignalType = keyof SignalPayload

type Handler<T extends SignalType> = (payload: SignalPayload[T]) => void

class SignalBus {
  private listeners = new Map<string, Set<Handler<SignalType>>>()

  on<T extends SignalType>(type: T, handler: Handler<T>): () => void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set())
    const set = this.listeners.get(type)!
    set.add(handler as Handler<SignalType>)
    return () => set.delete(handler as Handler<SignalType>)
  }

  emit<T extends SignalType>(type: T, payload: SignalPayload[T]): void {
    this.listeners.get(type)?.forEach(fn => fn(payload))
  }
}

export const bus = new SignalBus()
