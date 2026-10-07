'use client'

import { io, type Socket } from 'socket.io-client'

export type SignalType =
  | 'offer'
  | 'answer'
  | 'ice'
  | 'renegotiate-request'
  | 'chat'
  | 'reaction'

export type PeerJoinedInfo = { from: string; room: string; rejoin: boolean }
export type PeerLeftInfo = { from: string; room: string }
export type IncomingSignal = { type: string; data: unknown; from: string }
export type JoinResult = { ok: boolean; youAreCaller: boolean; roomId: string }

export type SignalingHandlers = {
  onConnect?: () => void
  onDisconnect?: () => void
  onReconnectAttempt?: (attempt: number) => void
  onReconnected?: () => void
  onPeerJoined?: (info: PeerJoinedInfo) => void
  onPeerLeft?: (info: PeerLeftInfo) => void
  onSignal?: (msg: IncomingSignal) => void
  onRoomFull?: () => void
}

// Socket.io client wrapper. Connects to the signaling mini-service (port 3003)
// through the Caddy gateway via XTransformPort. The socket itself is also made
// resilient (auto-reconnect) because a flaky network can drop the signaling
// channel too — we recover it so we can still drive an ICE restart afterwards.
export class Signaling {
  socket: Socket | null = null
  private handlers: SignalingHandlers
  private joinedRoom: string | null = null

  constructor(handlers: SignalingHandlers) {
    this.handlers = handlers
  }

  get connected() {
    return Boolean(this.socket?.connected)
  }

  connect() {
    if (this.socket) return
    const socket = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    })
    this.socket = socket

    socket.on('connect', () => this.handlers.onConnect?.())
    socket.on('disconnect', () => this.handlers.onDisconnect?.())
    socket.io.on('reconnect_attempt', (n: number) =>
      this.handlers.onReconnectAttempt?.(n),
    )
    socket.io.on('reconnect', () => this.handlers.onReconnected?.())
    socket.on('room:peer-joined', (i: PeerJoinedInfo) => {
      console.log('[vc] signaling: room:peer-joined', i)
      this.handlers.onPeerJoined?.(i)
    })
    socket.on('room:peer-left', (i: PeerLeftInfo) =>
      this.handlers.onPeerLeft?.(i),
    )
    socket.on('signal', (m: IncomingSignal) => this.handlers.onSignal?.(m))
    socket.on('room:full', () => this.handlers.onRoomFull?.())
  }

  async joinRoom(room: string, rejoin = false): Promise<JoinResult> {
    this.joinedRoom = room
    if (!this.socket) return { ok: false, youAreCaller: false, roomId: '' }
    return new Promise<JoinResult>((resolve) => {
      this.socket!.emit(
        'room:join',
        { room, rejoin },
        (r: JoinResult) => resolve(r),
      )
    })
  }

  /** Re-join the previously joined room (used after a signaling reconnect). */
  async rejoin(): Promise<JoinResult | null> {
    if (!this.joinedRoom || !this.socket) return null
    return new Promise<JoinResult | null>((resolve) => {
      this.socket!.emit(
        'room:join',
        { room: this.joinedRoom, rejoin: true },
        (r: JoinResult) => resolve(r),
      )
    })
  }

  sendSignal(type: SignalType, data: unknown) {
    this.socket?.emit('signal', { type, data })
  }

  leaveRoom() {
    this.socket?.emit('room:leave')
  }

  disconnect() {
    this.socket?.disconnect()
    this.socket = null
  }
}
