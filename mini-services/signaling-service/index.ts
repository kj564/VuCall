import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()

// IMPORTANT: path must stay `/` — Caddy uses it to route XTransformPort traffic.
const io = new Server(httpServer, {
  path: '/',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  // Keep signaling connection resilient — long pings help survive flaky networks.
  pingTimeout: 120000,
  pingInterval: 10000,
  maxHttpBufferSize: 1e6,
})

// ---------------------------------------------------------------------------
// Signaling server for 1:1 WebRTC video calls.
//
// Responsibilities:
//   - Room management (max 2 peers per room, keyed by a short room id)
//   - Relaying SDP offers/answers, ICE candidates, and renegotiation requests
//   - Presence: notify each peer when the other joins/leaves/reconnects
//
// The server is intentionally dumb — it never touches media. All P2P media
// flows directly between the two browsers via RTCPeerConnection.
// ---------------------------------------------------------------------------

type JoinPayload = { room: string; rejoin?: boolean }

// socket.id -> { room }
const socketRooms = new Map<string, string>()

// room -> ordered list of socket ids (max 2)
const roomPeers = new Map<string, string[]>()

function peersIn(room: string): string[] {
  return roomPeers.get(room) ?? []
}

function setPeersIn(room: string, ids: string[]) {
  if (ids.length === 0) roomPeers.delete(room)
  else roomPeers.set(room, ids)
}

function otherSocket(room: string, selfId: string): string | undefined {
  return peersIn(room).find((id) => id !== selfId)
}

io.on('connection', (socket) => {
  console.log(`[signaling] connected: ${socket.id}`)

  socket.on('room:join', (payload: JoinPayload, ack?: (r: { ok: boolean; youAreCaller: boolean; roomId: string }) => void) => {
    const room = String(payload?.room ?? '').trim()
    if (!room) {
      ack?.({ ok: false, youAreCaller: false, roomId: '' })
      return
    }

    // If this socket was already in another room, leave it first.
    const prev = socketRooms.get(socket.id)
    if (prev && prev !== room) leaveRoom(socket, prev)

    const peers = peersIn(room)
    if (peers.length >= 2) {
      // Room is full. Reject politely.
      ack?.({ ok: false, youAreCaller: false, roomId: room })
      socket.emit('room:full', { room })
      return
    }

    socket.join(room)
    socketRooms.set(socket.id, room)
    setPeersIn(room, [...peers, socket.id])

    const youAreCaller = peersIn(room)[0] === socket.id
    console.log(
      `[signaling] ${socket.id} joined room ${room} (peers now: ${peersIn(room).length}, caller=${youAreCaller})`,
    )

    ack?.({ ok: true, youAreCaller, roomId: room })

    // Notify the existing peer that someone joined (so they can negotiate).
    const other = otherSocket(room, socket.id)
    if (other) {
      io.to(other).emit('room:peer-joined', {
        from: socket.id,
        room,
        rejoin: Boolean(payload?.rejoin),
      })
    }
  })

  // Relay a signaling message to the other peer in the room.
  // `type` can be 'offer' | 'answer' | 'ice' | 'renegotiate' | 'media:update'
  socket.on('signal', (msg: { type: string; data: unknown }, ack?: () => void) => {
    const room = socketRooms.get(socket.id)
    if (!room) {
      console.log('[signaling] signal from', socket.id, 'but no room')
      return
    }
    const other = otherSocket(room, socket.id)
    console.log('[signaling] relay', msg.type, 'from', socket.id, 'room', room, 'to', other ?? '(none)')
    if (!other) return
    io.to(other).emit('signal', { type: msg.type, data: msg.data, from: socket.id })
    ack?.()
  })

  socket.on('room:leave', () => {
    const room = socketRooms.get(socket.id)
    if (room) leaveRoom(socket, room)
  })

  socket.on('disconnect', (reason) => {
    console.log(`[signaling] disconnected: ${socket.id} (${reason})`)
    const room = socketRooms.get(socket.id)
    if (room) leaveRoom(socket, room)
  })

  socket.on('error', (err) => {
    console.error(`[signaling] socket error (${socket.id}):`, err)
  })
})

function leaveRoom(socket: { id: string }, room: string) {
  socketRooms.delete(socket.id)
  const remaining = peersIn(room).filter((id) => id !== socket.id)
  setPeersIn(room, remaining)
  // Tell the remaining peer that the other side left.
  for (const id of remaining) {
    io.to(id).emit('room:peer-left', { room, from: socket.id })
  }
  console.log(`[signaling] ${socket.id} left room ${room} (peers now: ${remaining.length})`)
}

const PORT = 3003
httpServer.listen(PORT, () => {
  console.log(`[signaling] server listening on port ${PORT}`)
})

process.on('SIGTERM', () => {
  httpServer.close(() => process.exit(0))
})
process.on('SIGINT', () => {
  httpServer.close(() => process.exit(0))
})
