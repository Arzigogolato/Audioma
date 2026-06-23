import { bus } from './SignalBus'

const DEFAULT_URL = 'ws://localhost:8080'

export class OSCBridge {
  private ws: WebSocket | null = null
  private reconnectDelay = 2000

  connect(url = DEFAULT_URL): void {
    this.ws = new WebSocket(url)

    this.ws.onopen = () => console.log('[OSC] Bridge connected')
    this.ws.onclose = () => {
      console.warn('[OSC] Bridge disconnected, retrying...')
      setTimeout(() => this.connect(url), this.reconnectDelay)
    }
    this.ws.onerror = (e) => console.error('[OSC] Bridge error', e)

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as { address: string; args: unknown[] }
        bus.emit('osc', msg)
      } catch {
        console.warn('[OSC] Unparseable message', event.data)
      }
    }
  }

  send(address: string, ...args: unknown[]): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return
    this.ws.send(JSON.stringify({ address, args }))
  }

  disconnect(): void {
    this.ws?.close()
    this.ws = null
  }
}
