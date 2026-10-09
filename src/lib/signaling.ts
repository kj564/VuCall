'use client'

import mqtt from 'mqtt'

// Public MQTT broker over secure WebSocket (serverless signaling — no server to
// run, works on static hosting like GitHub Pages). For production you should
// run your own broker (e.g. EMQX/Mosquitto) and set NEXT_PUBLIC_MQTT_URL.
const BROKER_URL =
  process.env.NEXT_PUBLIC_MQTT_URL || 'wss://broker.emqx.io:8084/mqtt'
const TOPIC_PREFIX = 'vucall/'

export type SignalType =
  | 'offer'
  | 'answer'
  | 'ice'
  | 'renegotiate-request'
  | 'chat'
  | 'reaction'

export type PeerJoinedInfo = { from: string; polite: boolean }
export type PeerLeftInfo = { from: string }
export type IncomingSignal = { type: string; data: unknown; from: string }
export type JoinResult = { ok: boolean; youAreCaller: boolean; roomId: string }

/** A chat message received from a peer (text payload + timestamp). */
export type ChatMessage = {
  id: string
  from: 'me' | 'peer' | 'system'
  text: string
  ts: number
}

/** A floating emoji reaction received from a peer. */
export type ReactionEvent = {
  id: string
  emoji: string
  from: 'me' | 'peer'
  ts: number
}

export type SignalingHandlers = {
  onConnect?: () => void
  onDisconnect?: () => void
  onPeerJoined?: (info: PeerJoinedInfo) => void
  onPeerLeft?: (info: PeerLeftInfo) => void
  onSignal?: (msg: IncomingSignal) => void
  onRoomFull?: () => void
}

type WireMessage = {
  kind: 'join' | 'ping' | 'leave' | 'signal'
  from: string
  type?: string // for signal
  data?: unknown // for signal
}

function genId() {
  return Math.random().toString(36).slice(2, 10)
}

/**
 * Signaling over a public MQTT broker (WebSocket). The "room" maps to an MQTT
 * topic; peers subscribe + publish signaling (offer/answer/ICE) + presence
 * (join/ping/leave) to it. No server process is required — the browser talks
 * directly to the broker, so this works on static hosting (GitHub Pages).
 *
 * Presence: on connect a peer announces "join" + pings every 5s (so a
 * late-joining peer discovers it). A Last Will ("leave") fires on unexpected
 * disconnect. The polite/impolite role (for perfect-negotiation glare) is
 * derived deterministically from the two peer ids: polite = (myId > peerId).
 */
export class Signaling {
  private handlers: SignalingHandlers
  private myId: string
  private room: string | null = null
  private client: mqtt.MqttClient | null = null
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private knownPeers = new Set<string>()

  constructor(handlers: SignalingHandlers) {
    this.handlers = handlers
    this.myId = genId()
  }

  get connected() {
    return Boolean(this.client?.connected)
  }

  get myPeerId() {
    return this.myId
  }

  connect() {
    // MQTT connects in joinRoom (needs the room/topic). No-op here.
  }

  async joinRoom(room: string, _rejoin = false): Promise<JoinResult> {
    this.room = room
    const topic = `${TOPIC_PREFIX}${room}`
    const leavePayload = JSON.stringify({
      kind: 'leave',
      from: this.myId,
    } as WireMessage)

    const client = mqtt.connect(BROKER_URL, {
      clientId: `vucall-${this.myId}-${genId()}`,
      clean: true,
      reconnectPeriod: 2000,
      connectTimeout: 10000,
      will: { topic, payload: leavePayload, qos: 0, retain: false },
    })
    this.client = client

    client.on('connect', () => {
      client.subscribe(topic, (err) => {
        if (err) {
          console.error('[signaling] subscribe error:', err)
          return
        }
        // Announce presence.
        this.publish({ kind: 'join', from: this.myId })
        // Periodic ping so late-joiners discover us.
        if (this.pingTimer) clearInterval(this.pingTimer)
        this.pingTimer = setInterval(() => {
          this.publish({ kind: 'ping', from: this.myId })
        }, 5000)
        this.handlers.onConnect?.()
      })
    })

    client.on('message', (_topic, payload) => {
      let msg: WireMessage
      try {
        msg = JSON.parse(payload.toString()) as WireMessage
      } catch {
        return
      }
      if (!msg || msg.from === this.myId) return // ignore own echo
      this.handleMessage(msg)
    })

    client.on('close', () => this.handlers.onDisconnect?.())
    client.on('error', (e) => console.error('[signaling] mqtt error:', e))

    return { ok: true, youAreCaller: false, roomId: room }
  }

  private handleMessage(msg: WireMessage) {
    if (msg.kind === 'join' || msg.kind === 'ping') {
      if (this.knownPeers.has(msg.from)) {
        // Already know this peer — just a ping refresh (no re-trigger).
        return
      }
      this.knownPeers.add(msg.from)
      const polite = this.myId > msg.from
      this.handlers.onPeerJoined?.({ from: msg.from, polite })
    } else if (msg.kind === 'leave') {
      if (this.knownPeers.has(msg.from)) {
        this.knownPeers.delete(msg.from)
        this.handlers.onPeerLeft?.({ from: msg.from })
      }
    } else if (msg.kind === 'signal') {
      this.handlers.onSignal?.({ type: msg.type!, data: msg.data, from: msg.from })
    }
  }

  private publish(msg: WireMessage) {
    if (!this.client || !this.room) return
    this.client.publish(`${TOPIC_PREFIX}${this.room}`, JSON.stringify(msg))
  }

  sendSignal(type: SignalType, data: unknown) {
    this.publish({ kind: 'signal', from: this.myId, type, data })
  }

  /** Re-join the previously joined room (used after a reconnect). */
  async rejoin(): Promise<JoinResult | null> {
    if (!this.room) return null
    return this.joinRoom(this.room, true)
  }

  leaveRoom() {
    this.publish({ kind: 'leave', from: this.myId })
  }

  disconnect() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
    if (this.client) {
      this.client.end(true)
      this.client = null
    }
    this.knownPeers.clear()
  }
}
