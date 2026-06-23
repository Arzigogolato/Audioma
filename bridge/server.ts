import { WebSocketServer, WebSocket } from 'ws'
import { Server as OscServer, Client as OscClient, Message } from 'node-osc'

const WS_PORT  = 8080
const OSC_IN   = 57121   // receive OSC from DAW / external tools
const OSC_OUT  = 57120   // send OSC (e.g. to Ableton, TouchDesigner)
const OSC_HOST = '127.0.0.1'

// --- WebSocket server (browser side) ---
const wss = new WebSocketServer({ port: WS_PORT })
const clients = new Set<WebSocket>()

wss.on('connection', (ws) => {
  clients.add(ws)
  console.log(`[WS] Client connected (${clients.size} total)`)

  ws.on('close', () => {
    clients.delete(ws)
    console.log(`[WS] Client disconnected (${clients.size} remaining)`)
  })

  // Browser → OSC out
  ws.on('message', (data) => {
    try {
      const { address, args } = JSON.parse(data.toString()) as { address: string; args: unknown[] }
      const msg = new Message(address)
      for (const arg of args) {
        if (typeof arg === 'number') msg.append(arg)
        else if (typeof arg === 'string') msg.append(arg)
      }
      oscOut.send(msg)
    } catch (e) {
      console.warn('[WS→OSC] Parse error', e)
    }
  })
})

// --- OSC server (receive from external) ---
const oscOut = new OscClient(OSC_HOST, OSC_OUT)

const oscIn = new OscServer(OSC_IN, OSC_HOST, () => {
  console.log(`[OSC] Listening on ${OSC_HOST}:${OSC_IN}`)
})

oscIn.on('message', (msg: [string, ...unknown[]]) => {
  const [address, ...args] = msg
  const payload = JSON.stringify({ address, args })
  // Broadcast to all connected browser clients
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) client.send(payload)
  }
})

console.log(`[Bridge] WebSocket on :${WS_PORT} | OSC in :${OSC_IN} → out :${OSC_OUT}`)
