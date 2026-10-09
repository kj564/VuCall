'use client'

import type { Signaling } from './signaling'

// STUN can help establish direct paths. For restrictive networks, VuCall
// fetches short-lived TURN credentials from a trusted HTTPS endpoint (Cloudflare
// Worker). Never put a permanent TURN API token in NEXT_PUBLIC_* variables.
const ICE_CONFIG_URL = process.env.NEXT_PUBLIC_ICE_CONFIG_URL || ''

const STUN_FALLBACK_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
]

// Retained as a compatibility export for any code importing ICE_SERVERS.
// CallManager uses getIceServers() so it can await the Worker response.
export const ICE_SERVERS: RTCIceServer[] = STUN_FALLBACK_SERVERS

type IceConfigResponse = {
  iceServers?: RTCIceServer[]
}

async function getIceServers(): Promise<RTCIceServer[]> {
  if (!ICE_CONFIG_URL) {
    console.warn('[vc] NEXT_PUBLIC_ICE_CONFIG_URL is not set; using STUN-only fallback. TURN may be required on restrictive networks.')
    return STUN_FALLBACK_SERVERS
  }

  const response = await fetch(ICE_CONFIG_URL, {
    method: 'GET',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`ICE configuration endpoint returned HTTP ${response.status}`)
  }

  const config = (await response.json()) as IceConfigResponse
  if (!Array.isArray(config.iceServers) || config.iceServers.length === 0) {
    throw new Error('ICE configuration endpoint returned no iceServers')
  }

  const hasUsableServer = config.iceServers.some((server) =>
    Array.isArray(server.urls) ? server.urls.length > 0 : Boolean(server.urls),
  )
  if (!hasUsableServer) {
    throw new Error('ICE configuration endpoint returned invalid server URLs')
  }

  console.info('[vc] loaded ICE server configuration', {
    serverCount: config.iceServers.length,
    hasTurn: config.iceServers.some((server) => {
      const urls = Array.isArray(server.urls) ? server.urls : [server.urls]
      return urls.some((url) => typeof url === 'string' && url.startsWith('turn'))
    }),
  })

  return config.iceServers
}

export type CallStatus =
  | 'idle'
  | 'requesting-media'
  | 'waiting'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'ended'
  | 'failed'

export type NetworkQuality = 0 | 1 | 2 | 3 | 4 // 0 = none, 4 = excellent

export type CallManagerHandlers = {
  onRemoteStream?: (stream: MediaStream | null) => void
  onStatus?: (status: CallStatus, detail?: string) => void
  onReconnectAttempt?: (attempt: number) => void
  onError?: (message: string) => void
  onQuality?: (quality: NetworkQuality) => void
}

/**
 * CallManager drives a single RTCPeerConnection between two browsers.
 *
 * Resilience design (this is what beats Instagram's "connection lost"):
 *  - Perfect-negotiation pattern so either side can (re)negotiate safely.
 *  - ICE restart + renegotiation on `failed`/`disconnected` ICE states.
 *  - Network online/offline listeners trigger recovery instead of tearing down.
 *  - A bounded retry loop with backoff — the call is only ended by the user,
 *    never auto-dropped by a transient network blip.
 */
export class CallManager {
  private pc: RTCPeerConnection | null = null
  private signaling: Signaling
  private polite: boolean
  private handlers: CallManagerHandlers

  private localStream: MediaStream | null = null
  private senders: RTCRtpSender[] = []
  private peerPresent = false
  private status: CallStatus = 'idle'

  // Perfect-negotiation state
  private makingOffer = false
  private ignoreOffer = false

  // Buffered initial offer / candidates (until the peer is present)
  private pendingOffer: RTCSessionDescriptionInit | null = null
  private pendingCandidates: RTCIceCandidateInit[] = []
  // ICE can arrive before the remote SDP is installed; buffer it until then.
  private pendingRemoteCandidates: RTCIceCandidateInit[] = []

  // Reconnection bookkeeping
  private reconnectAttempts = 0
  private maxReconnectAttempts = 8
  private reconnecting = false
  private restartInProgress = false
  private disconnectedTimer: ReturnType<typeof setTimeout> | null = null
  private qualityTimer: ReturnType<typeof setInterval> | null = null
  private previousInboundPackets = new Map<string, { received: number; lost: number }>()
  // Signals that arrived before the RTCPeerConnection was built — replayed
  // once buildPeerConnection() finishes so nothing gets dropped during the
  // getUserMedia/setup window.
  private pendingSignals: Array<{ type: string; data: unknown }> = []
  private mediaFacing = 'user' as 'user' | 'environment'
  private micEnabled = true
  private camEnabled = true
  private usingSynthetic = false
  private syntheticCleanup: (() => void) | null = null
  // Screen-share state — the original camera video track is swapped out for a
  // display-media track on the video sender while sharing.
  private originalVideoTrack: MediaStreamTrack | null = null
  private sharing = false
  private screenStream: MediaStream | null = null
  // Mirror pipeline — routes the camera video through a canvas that draws it
  // horizontally flipped, so the SENT stream (not just the local preview) is
  // mirrored. The receiver sees the mirrored feed.
  private mirrorCanvas: HTMLCanvasElement | null = null
  private mirrorVideo: HTMLVideoElement | null = null
  private mirrorRaf = 0
  private mirrorStream: MediaStream | null = null
  private mirrorCleanup: (() => void) | null = null
  private mirrored = false
  private rawVideoTrack: MediaStreamTrack | null = null

  // Bound listeners for clean-up
  private onlineListener: (() => void) | null = null
  private offlineListener: (() => void) | null = null

  constructor(
    signaling: Signaling,
    polite: boolean,
    handlers: CallManagerHandlers,
  ) {
    this.signaling = signaling
    this.polite = polite
    this.handlers = handlers
  }

  get currentStatus() {
    return this.status
  }

  /** Acquire camera + mic (or use a pre-acquired stream), build the peer
   *  connection, and negotiate. Accepting a prebuilt stream lets the UI show
   *  the local camera immediately on mount, independent of signaling. */
  async start(prebuilt?: AcquiredMedia): Promise<MediaStream | null> {
    this.setStatus('requesting-media')
    let iceServers: RTCIceServer[]
    try {
      iceServers = await getIceServers()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load ICE configuration'
      console.error('[vc] failed to load ICE configuration:', message)
      this.handlers.onError?.(message)
      this.setStatus('failed', 'ice-config-failed')
      throw error
    }

    const acq = prebuilt ?? (await acquireLocalMedia(this.mediaFacing))
    this.usingSynthetic = acq.synthetic
    if (acq.synthetic && acq.cleanup) {
      this.syntheticCleanup = acq.cleanup
    }
    const stream = acq.stream
    this.localStream = stream
    this.micEnabled = true
    this.camEnabled = stream.getVideoTracks().length > 0

    this.buildPeerConnection(stream, iceServers)
    this.attachNetworkListeners()
    this.startQualityMonitor()
    // Replay any signals that arrived while the peer connection was being set up.
    this.drainPendingSignals()

    // With serverless (MQTT) signaling, the manager is created when the peer
    // is already discovered → peerPresent = true. Both peers send offers
    // (symmetric glare), resolved by the polite/impolite roles.
    this.peerPresent = true
    this.setStatus('connecting')
    return stream
  }

  private buildPeerConnection(stream: MediaStream, iceServers: RTCIceServer[]) {
    const pc = new RTCPeerConnection({ iceServers })
    this.pc = pc

    for (const track of stream.getTracks()) {
      const sender = pc.addTrack(track, stream)
      this.senders.push(sender)
    }

    // Aggregate every incoming audio/video track into one stable MediaStream.
    // Some browsers expose separate stream objects (or no stream at all) for
    // each track; swapping the UI between those objects can leave remote media
    // black or silent even though the RTCPeerConnection delivered the tracks.
    const remoteMedia = new MediaStream()
    pc.ontrack = (e) => {
      if (!remoteMedia.getTracks().some((track) => track.id === e.track.id)) {
        remoteMedia.addTrack(e.track)
      }
      console.info('[vc] remote track received', {
        kind: e.track.kind,
        readyState: e.track.readyState,
        muted: e.track.muted,
        enabled: e.track.enabled,
        streamIds: e.streams.map((stream) => stream.id),
        remoteTracks: remoteMedia.getTracks().map((track) => ({
          kind: track.kind,
          readyState: track.readyState,
          muted: track.muted,
          enabled: track.enabled,
        })),
      })
      this.handlers.onRemoteStream?.(remoteMedia)
      e.track.onunmute = () => {
        console.info('[vc] remote track unmuted:', e.track.kind)
        this.handlers.onRemoteStream?.(remoteMedia)
      }
      e.track.onmute = () => console.warn('[vc] remote track muted:', e.track.kind)
      e.track.onended = () => {
        console.warn('[vc] remote track ended:', e.track.kind)
        this.handlers.onRemoteStream?.(remoteMedia)
      }
      if (this.status !== 'connected' && this.status !== 'reconnecting') {
        this.setStatus('connecting')
      }
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        if (this.peerPresent) {
          this.signaling.sendSignal('ice', e.candidate.toJSON())
        } else {
          this.pendingCandidates.push(e.candidate.toJSON())
        }
      }
    }

    // Perfect negotiation: drive outgoing offers from negotiationneeded.
    pc.onnegotiationneeded = async () => {
      if (this.restartInProgress) return
      // Only the impolite peer initiates the initial negotiation. If both
      // browsers create offers at once, a public signaling broker can deliver
      // a glare sequence that leaves both sides stuck in "connecting".
      // The polite peer waits for the offer and answers it in handleSignal().
      if (this.polite && pc.signalingState === 'stable') return
      // If we're processing a remote offer, the answer is created in
      // handleSignal — don't fire a competing offer.
      if (pc.signalingState === 'have-remote-offer') return
      try {
        this.makingOffer = true
        const offer = await pc.createOffer()
        // Re-check: a remote offer may have arrived during createOffer.
        if (pc.signalingState === 'have-remote-offer') return
        await pc.setLocalDescription(offer)
        if (this.peerPresent) {
          this.signaling.sendSignal('offer', pc.localDescription)
        } else {
          this.pendingOffer = pc.localDescription
            ? (pc.localDescription.toJSON() as RTCSessionDescriptionInit)
            : null
        }
      } catch (error) {
        console.error('[vc] negotiation failed:', error)
      } finally {
        this.makingOffer = false
      }
    }

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState
      console.log('[vc] ice state:', state, '| connection:', pc.connectionState, '| signaling:', pc.signalingState, '| gathering:', pc.iceGatheringState)
      if (state === 'failed') {
        console.error('[vc] ICE failed. Check TURN configuration; STUN-only may fail across restrictive networks.')
      }
      this.emitQuality(state)
      if (state === 'connected' || state === 'completed') {
        this.clearReconnect()
        this.reconnectAttempts = 0
        this.setStatus('connected')
      } else if (state === 'disconnected') {
        // Brief grace period — many "disconnected" events self-recover.
        this.scheduleReconnectCheck()
      } else if (state === 'failed') {
        this.handleConnectionFailure('ice-failed')
      }
    }

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState
      if (state === 'failed') {
        this.handleConnectionFailure('connection-failed')
      } else if (state === 'disconnected') {
        this.scheduleReconnectCheck()
      }
    }
  }

  /** Called by the caller when the callee joins the room. */
  onPeerJoined() {
    this.peerPresent = true
    this.setStatus('connecting')
    if (this.pendingOffer && this.pc) {
      this.signaling.sendSignal('offer', this.pendingOffer)
      this.pendingOffer = null
    }
    for (const c of this.pendingCandidates) {
      this.signaling.sendSignal('ice', c)
    }
    this.pendingCandidates = []
  }

  private drainPendingSignals() {
    if (this.pendingSignals.length === 0) return
    console.log('[vc] draining', this.pendingSignals.length, 'pending signals')
    const queue = this.pendingSignals
    this.pendingSignals = []
    for (const m of queue) {
      void this.handleSignal(m)
    }
  }

  /** Called when the remote peer leaves (ends call / closes tab). */
  onPeerLeft() {
    this.peerPresent = false
    this.handlers.onRemoteStream?.(null)
    this.setStatus('ended', 'peer-left')
  }

  /** Dispatch an incoming signaling message (offer / answer / ice / renegotiate). */
  async handleSignal(msg: { type: string; data: unknown }) {
    const pc = this.pc
    if (!pc) {
      // Peer connection not built yet (e.g. still acquiring media). Buffer and
      // replay after buildPeerConnection() — never drop the offer.
      this.pendingSignals.push(msg)
      return
    }
    try {
      if (msg.type === 'offer' || msg.type === 'answer') {
        const desc = msg.data as RTCSessionDescriptionInit
        const offerCollision =
          msg.type === 'offer' &&
          (this.makingOffer || pc.signalingState !== 'stable')
        this.ignoreOffer = !this.polite && offerCollision
        if (this.ignoreOffer) return

        await pc.setRemoteDescription(desc)
        // Trickle ICE may arrive before the offer/answer over MQTT.
        const queuedCandidates = this.pendingRemoteCandidates.splice(0)
        for (const candidate of queuedCandidates) {
          try {
            await pc.addIceCandidate(candidate)
          } catch (candidateError) {
            if (!this.ignoreOffer) console.warn('[webrtc] queued ICE candidate rejected:', candidateError)
          }
        }
        if (msg.type === 'offer') {
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          this.signaling.sendSignal('answer', pc.localDescription)
        }
      } else if (msg.type === 'ice') {
        const candidate = msg.data as RTCIceCandidateInit
        if (!pc.remoteDescription) {
          this.pendingRemoteCandidates.push(candidate)
          return
        }
        try {
          await pc.addIceCandidate(candidate)
        } catch (e) {
          if (!this.ignoreOffer) console.warn('[webrtc] ICE candidate rejected:', e)
        }
      } else if (msg.type === 'renegotiate-request') {
        await this.restartConnection('remote-request')
      }
    } catch (error) {
      // Surface signaling/SDP errors so a stuck connection can be diagnosed.
      console.error('[vc] signal handling failed:', error)
    }
  }

  // -------------------------------------------------------------------------
  // Connection quality monitor — use WebRTC transport/media stats, not ICE
  // state alone, so users can see degradation before the call disconnects.
  // -------------------------------------------------------------------------

  private startQualityMonitor() {
    if (this.qualityTimer) clearInterval(this.qualityTimer)
    this.qualityTimer = setInterval(() => {
      void this.measureConnectionQuality()
    }, 3000)
    void this.measureConnectionQuality()
  }

  private async measureConnectionQuality() {
    const pc = this.pc
    if (!pc || pc.connectionState === 'closed') return

    try {
      const stats = await pc.getStats()
      let roundTripTime: number | undefined
      let maxJitter = 0
      let totalLost = 0
      let totalReceived = 0

      stats.forEach((report) => {
        if (
          report.type === 'candidate-pair' &&
          (report.state === 'succeeded' || report.nominated) &&
          typeof report.currentRoundTripTime === 'number'
        ) {
          roundTripTime = Math.max(roundTripTime ?? 0, report.currentRoundTripTime)
        }

        if (report.type === 'inbound-rtp' && !report.isRemote) {
          if (typeof report.jitter === 'number') maxJitter = Math.max(maxJitter, report.jitter)

          const received = typeof report.packetsReceived === 'number' ? report.packetsReceived : 0
          const lost = typeof report.packetsLost === 'number' ? Math.max(0, report.packetsLost) : 0
          const previous = this.previousInboundPackets.get(report.id)
          if (previous) {
            totalReceived += Math.max(0, received - previous.received)
            totalLost += Math.max(0, lost - previous.lost)
          }
          this.previousInboundPackets.set(report.id, { received, lost })
        }
      })

      let quality: NetworkQuality = 4
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
        quality = 0
      } else if (pc.iceConnectionState !== 'connected' && pc.iceConnectionState !== 'completed') {
        quality = 2
      }

      if (typeof roundTripTime === 'number') {
        if (roundTripTime > 0.8) quality = Math.min(quality, 1) as NetworkQuality
        else if (roundTripTime > 0.45) quality = Math.min(quality, 2) as NetworkQuality
        else if (roundTripTime > 0.25) quality = Math.min(quality, 3) as NetworkQuality
      }
      if (maxJitter > 0.08) quality = Math.min(quality, 1) as NetworkQuality
      else if (maxJitter > 0.04) quality = Math.min(quality, 2) as NetworkQuality

      const packetTotal = totalLost + totalReceived
      if (packetTotal > 0) {
        const lossRatio = totalLost / packetTotal
        if (lossRatio > 0.12) quality = Math.min(quality, 1) as NetworkQuality
        else if (lossRatio > 0.05) quality = Math.min(quality, 2) as NetworkQuality
        else if (lossRatio > 0.02) quality = Math.min(quality, 3) as NetworkQuality
      }

      this.handlers.onQuality?.(quality)
    } catch {
      // Stats are best-effort and not supported consistently by every browser.
    }
  }

  private stopQualityMonitor() {
    if (this.qualityTimer) {
      clearInterval(this.qualityTimer)
      this.qualityTimer = null
    }
    this.previousInboundPackets.clear()
  }

  // -------------------------------------------------------------------------
  // Reconnection logic — the whole point of beating "connection lost".
  // -------------------------------------------------------------------------

  /** Map the ICE connection state to a 0–4 quality score. */
  private emitQuality(iceState: RTCIceConnectionState) {
    let q: NetworkQuality
    switch (iceState) {
      case 'connected':
      case 'completed':
        q = 4
        break
      case 'checking':
        q = 2
        break
      case 'new':
        q = 1
        break
      case 'disconnected':
        q = 1
        break
      case 'failed':
      case 'closed':
        q = 0
        break
      default:
        q = 1
    }
    this.handlers.onQuality?.(q)
  }

  // -------------------------------------------------------------------------
  // Reconnection logic — the whole point of beating "connection lost".
  // -------------------------------------------------------------------------

  private scheduleReconnectCheck() {
    if (this.disconnectedTimer) return
    if (this.status === 'connected') this.setStatus('reconnecting')
    this.disconnectedTimer = setTimeout(() => {
      this.disconnectedTimer = null
      const pc = this.pc
      if (!pc) return
      const ice = pc.iceConnectionState
      if (ice === 'disconnected' || ice === 'failed') {
        this.handleConnectionFailure('disconnected-timeout')
      }
    }, 4000)
  }

  private async handleConnectionFailure(reason: string) {
    if (this.reconnecting) return
    // A temporary network outage should not permanently end an LDR call.
    // Keep retrying with a capped exponential backoff until the user ends the
    // call or the peer explicitly leaves. Cap the displayed attempt counter so
    // the UI remains readable during a long outage.
    this.reconnecting = true
    this.reconnectAttempts = Math.min(this.reconnectAttempts + 1, this.maxReconnectAttempts)
    this.handlers.onReconnectAttempt?.(this.reconnectAttempts)
    this.setStatus('reconnecting', reason)
    const delay = Math.min(15000, 1000 * 2 ** (this.reconnectAttempts - 1))
    await new Promise((r) => setTimeout(r, delay))
    try {
      await this.restartConnection(reason)
    } catch (err) {
      console.error('[webrtc] restart failed:', err)
    } finally {
      this.reconnecting = false
    }
  }

  private async restartConnection(_reason: string) {
    const pc = this.pc
    if (!pc) return
    // Suppress the auto onnegotiationneeded so we don't emit a second,
    // non-restart offer and cause glare.
    this.restartInProgress = true
    // Mark for ICE restart; the next created offer will carry fresh ICE creds.
    try {
      pc.restartIce()
    } catch {
      /* not all engines expose restartIce — ignore */
    }
    // Manually create a restart offer (onnegotiationneeded won't fire for restarts).
    this.makingOffer = true
    try {
      const offer = await pc.createOffer({ iceRestart: true })
      await pc.setLocalDescription(offer)
      if (this.peerPresent) {
        console.log('[vc] sending ICE-restart offer')
        this.signaling.sendSignal('offer', pc.localDescription)
      }
    } catch (err) {
      console.error('[webrtc] restart offer error:', err)
    } finally {
      this.makingOffer = false
      this.restartInProgress = false
    }
  }

  private clearReconnect() {
    if (this.disconnectedTimer) {
      clearTimeout(this.disconnectedTimer)
      this.disconnectedTimer = null
    }
  }

  private attachNetworkListeners() {
    this.onlineListener = () => {
      // Network is back. If the ICE agent actually dropped, restart it; if it
      // stayed up through the blip, just make sure the status reflects reality
      // (don't leave a stale "reconnecting" up forever).
      const pc = this.pc
      if (!pc) return
      if (this.status === 'reconnecting' || this.status === 'failed') {
        this.reconnectAttempts = 0
        void this.restartConnection('network-online')
      } else if (
        pc.iceConnectionState === 'connected' ||
        pc.iceConnectionState === 'completed'
      ) {
        this.setStatus('connected')
      }
    }
    this.offlineListener = () => {
      // Don't prematurely flip to 'reconnecting' — the ICE agent is the source
      // of truth and will report 'disconnected' if the outage actually
      // persists. We only nudge recovery when the network returns.
      console.log('[vc] network went offline')
    }
    window.addEventListener('online', this.onlineListener)
    window.addEventListener('offline', this.offlineListener)
  }

  // -------------------------------------------------------------------------
  // Media controls — implemented via track.enabled / replaceTrack so they do
  // NOT require renegotiation (keeps the media path stable).
  // -------------------------------------------------------------------------

  toggleMic(): boolean {
    if (!this.localStream) return false
    const track = this.localStream.getAudioTracks()[0]
    if (!track) return false
    this.micEnabled = !this.micEnabled
    track.enabled = this.micEnabled
    return this.micEnabled
  }

  toggleCam(): boolean {
    if (!this.localStream) return false
    const track = this.localStream.getVideoTracks()[0]
    if (!track) return false
    this.camEnabled = !this.camEnabled
    track.enabled = this.camEnabled
    return this.camEnabled
  }

  async switchCamera(): Promise<boolean> {
    if (!this.localStream) return false
    const oldTrack = this.localStream.getVideoTracks()[0]
    if (!oldTrack) return false

    // Stop the mirror canvas BEFORE switching — it references the old track.
    const wasMirrored = this.mirrored
    if (this.mirrored) {
      await this.stopMirror()
    }

    const newFacing = this.mediaFacing === 'user' ? 'environment' : 'user'
    this.mediaFacing = newFacing

    let candidateStream: MediaStream | null = null
    try {
      // Use `ideal` (soft constraint) — `exact` fails on iOS Safari + some devices.
      candidateStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: newFacing },
          width: { ideal: 640 },
          height: { ideal: 360 },
          frameRate: { ideal: 24, max: 30 },
        },
        audio: false,
      })
      const newTrack = candidateStream.getVideoTracks()[0]
      if (!newTrack) {
        candidateStream.getTracks().forEach((track) => track.stop())
        candidateStream = null
        return false
      }

      const sender = this.senders.find((s) => s.track?.kind === 'video')
      if (!sender) {
        newTrack.stop()
        return false
      }

      // Replace the sender's track (no renegotiation needed).
      await sender.replaceTrack(newTrack)

      // Swap in the local stream (for the local preview).
      this.localStream.removeTrack(oldTrack)
      oldTrack.stop()
      this.localStream.addTrack(newTrack)
      newTrack.enabled = this.camEnabled
      // Ownership of the active track now belongs to localStream. Clear the
      // temporary reference so the catch cleanup never stops a live camera.
      candidateStream = null

      // Re-enable mirror if it was on + we're on the front camera.
      if (wasMirrored && this.mediaFacing === 'user') {
        await this.startMirror()
      }

      return true
    } catch (e) {
      // getUserMedia may succeed before replaceTrack fails. Stop that temporary
      // stream on every failure so repeated camera switches cannot leak tracks.
      candidateStream?.getTracks().forEach((track) => track.stop())
      candidateStream = null
      console.error('[webrtc] switchCamera failed:', e)
      // Revert the facing on failure.
      this.mediaFacing = this.mediaFacing === 'user' ? 'environment' : 'user'
      // Re-enable mirror if it was on.
      if (wasMirrored && this.mediaFacing === 'user') {
        await this.startMirror()
      }
      return false
    }
  }

  getMicEnabled() {
    return this.micEnabled
  }
  /** Current camera facing ('user' = front, 'environment' = back). */
  getFacing() {
    return this.mediaFacing
  }
  /** The current local MediaStream (raw, or the mirror-canvas stream when mirrored). */
  getLocalStream() {
    return this.localStream
  }

  /**
   * Mirror the SENT video stream by routing the camera through a canvas that
   * draws it horizontally flipped. Both the local preview AND the peer's
   * received stream are mirrored (not just a CSS flip on the preview).
   * No-op for the back camera or while screen-sharing.
   */
  async setMirrored(enabled: boolean) {
    if (enabled && this.mediaFacing !== 'user') return // back camera: never mirror
    if (enabled && this.sharing) return // while sharing, mirror has no effect

    // Keep the original camera track as the outgoing WebRTC track. Replacing
    // it with canvas.captureStream() caused black frames on some mobile
    // browsers and could alter the transmitted aspect ratio. The local
    // VideoTile applies a CSS mirror, which does not affect the sent track.
    // Intentionally do not start/stop the canvas mirror pipeline here.
    void enabled
  }

  private async startMirror() {
    if (!this.localStream || this.mirrored) return
    const rawTrack = this.localStream.getVideoTracks()[0]
    if (!rawTrack) return

    const video = document.createElement('video')
    video.srcObject = new MediaStream([rawTrack])
    video.muted = true
    video.playsInline = true
    video.autoplay = true
    video.style.cssText =
      'position:fixed;left:-9999px;top:-9999px;width:2px;height:2px;opacity:0;pointer-events:none'
    document.body.appendChild(video)

    try {
      await video.play()
    } catch {
      // If the hidden source video cannot play, keep the raw camera track.
      // Replacing it with an unpainted canvas would show a black screen.
      video.srcObject = null
      video.remove()
      return
    }

    // Wait briefly for the first decoded camera frame before replacing the
    // outgoing track. This prevents peers from receiving a blank canvas while
    // mobile browsers are still initializing the camera.
    if (!video.videoWidth || !video.videoHeight) {
      await new Promise<void>((resolve) => {
        const finish = () => {
          window.clearTimeout(timeout)
          video.removeEventListener('loadeddata', finish)
          resolve()
        }
        const timeout = window.setTimeout(finish, 1200)
        video.addEventListener('loadeddata', finish, { once: true })
      })
    }
    if (!video.videoWidth || !video.videoHeight) {
      video.srcObject = null
      video.remove()
      return
    }

    // Keep the source aspect ratio while bounding the canvas to 640×360.
    // A fixed 16:9 canvas stretched 4:3 and portrait camera feeds.
    const scale = Math.min(
      640 / video.videoWidth,
      360 / video.videoHeight,
      1,
    )
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale))
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale))
    canvas.style.cssText =
      'position:fixed;left:-9999px;top:-9999px;width:2px;height:2px;opacity:0;pointer-events:none'
    document.body.appendChild(canvas)

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      video.srcObject = null
      video.remove()
      canvas.remove()
      return
    }

    // Draw the first frame before creating/sending the captured stream so the
    // remote peer never starts on an intentionally blank canvas.
    const drawFrame = () => {
      ctx.save()
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      ctx.restore()
    }
    drawFrame()

    // Draw at most 24 fps rather than repainting on every display refresh.
    let lastDrawAt = 0
    const draw = (now = 0) => {
      if (now - lastDrawAt >= 1000 / 24 && video.videoWidth && video.videoHeight) {
        drawFrame()
        lastDrawAt = now
      }
      this.mirrorRaf = requestAnimationFrame(draw)
    }
    draw()

    const mirrorStream = canvas.captureStream(24)
    const mirrorTrack = mirrorStream.getVideoTracks()[0]
    if (!mirrorTrack) {
      cancelAnimationFrame(this.mirrorRaf)
      video.srcObject = null
      video.remove()
      canvas.remove()
      mirrorStream.getTracks().forEach((track) => track.stop())
      return
    }

    const sender = this.senders.find((s) => s.track?.kind === 'video')
    if (!sender) {
      cancelAnimationFrame(this.mirrorRaf)
      video.srcObject = null
      video.remove()
      canvas.remove()
      mirrorStream.getTracks().forEach((track) => track.stop())
      return
    }

    try {
      await sender.replaceTrack(mirrorTrack)
    } catch (error) {
      console.error('[vc] unable to enable mirrored video:', error)
      cancelAnimationFrame(this.mirrorRaf)
      video.srcObject = null
      video.remove()
      canvas.remove()
      mirrorStream.getTracks().forEach((track) => track.stop())
      return
    }

    this.rawVideoTrack = rawTrack
    this.mirrorVideo = video
    this.mirrorCanvas = canvas
    this.mirrorStream = mirrorStream
    this.mirrorCleanup = () => {
      cancelAnimationFrame(this.mirrorRaf)
      this.mirrorRaf = 0
      mirrorStream.getTracks().forEach((track) => track.stop())
      video.pause()
      video.srcObject = null
      video.remove()
      canvas.remove()
    }
    this.mirrored = true
  }

  private async stopMirror() {
    if (!this.mirrored) return
    // Capture the stream up-front — close() may null this.localStream while we
    // await replaceTrack below, which previously caused a null-deref.
    const ls = this.localStream
    if (!ls) {
      this.mirrored = false
      return
    }
    const sender = this.senders.find((s) => s.track?.kind === 'video')
    if (this.rawVideoTrack && sender) {
      try {
        await sender.replaceTrack(this.rawVideoTrack)
      } catch {
        /* ignore */
      }
    }
    if (!this.localStream) {
      // Torn down during the await — just clean up the canvas.
      this.mirrorCleanup?.()
      this.mirrorCleanup = null
      this.mirrored = false
      this.rawVideoTrack = null
      return
    }
    const restored = new MediaStream()
    for (const t of ls.getAudioTracks()) restored.addTrack(t)
    if (this.rawVideoTrack) restored.addTrack(this.rawVideoTrack)
    this.localStream = restored
    this.mirrorCleanup?.()
    this.mirrorCleanup = null
    this.mirrorVideo = null
    this.mirrorCanvas = null
    this.mirrorStream = null
    this.rawVideoTrack = null
    this.mirrored = false
  }

  /** Whether the user is currently sharing their screen instead of the camera. */
  isScreenSharing() {
    return this.sharing
  }

  /**
   * Toggle screen-share ("Share your screen", like Instagram VC). Swaps the
   * video sender's track to a getDisplayMedia track; restores the camera when
   * stopped. Uses replaceTrack so no renegotiation is needed.
   */
  async toggleScreenShare(): Promise<boolean> {
    if (this.sharing) {
      return this.stopScreenShare()
    }
    // Stop the mirror canvas first so screen-share swaps from the RAW camera
    // track (the call-room re-applies mirror after sharing stops if needed).
    if (this.mirrored) await this.stopMirror()
    if (!this.localStream) return false
    const cameraTrack = this.localStream.getVideoTracks()[0]
    if (!cameraTrack) return false
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 15 } },
        audio: false,
      })
      const screenTrack = display.getVideoTracks()[0]
      if (!screenTrack) {
        display.getTracks().forEach((t) => t.stop())
        return false
      }
      const sender = this.senders.find((s) => s.track?.kind === 'video')
      if (sender) await sender.replaceTrack(screenTrack)
      this.originalVideoTrack = cameraTrack
      this.screenStream = display
      // Swap the local preview to the screen track too.
      this.localStream.removeTrack(cameraTrack)
      this.localStream.addTrack(screenTrack)
      this.sharing = true
      // If the user stops sharing from the browser's native "Stop sharing" bar,
      // restore the camera automatically.
      screenTrack.addEventListener('ended', () => {
        void this.stopScreenShare()
      })
      return true
    } catch (e) {
      console.error('[webrtc] screen share failed:', e)
      return false
    }
  }

  /** Restore the camera video track (also called on call end). */
  async stopScreenShare(): Promise<boolean> {
    if (!this.sharing || !this.localStream) {
      this.sharing = false
      return false
    }
    const screenTrack = this.localStream.getVideoTracks()[0]
    const sender = this.senders.find((s) => s.track?.kind === 'video')
    if (this.originalVideoTrack && sender) {
      try {
        await sender.replaceTrack(this.originalVideoTrack)
      } catch {
        /* ignore */
      }
    }
    if (screenTrack) {
      this.localStream.removeTrack(screenTrack)
      screenTrack.stop()
    }
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((t) => t.stop())
      this.screenStream = null
    }
    if (this.originalVideoTrack) {
      this.localStream.addTrack(this.originalVideoTrack)
      this.originalVideoTrack.enabled = this.camEnabled
      this.originalVideoTrack = null
    }
    this.sharing = false
    return true
  }
  getCamEnabled() {
    return this.camEnabled
  }

  // -------------------------------------------------------------------------

  private setStatus(status: CallStatus, detail?: string) {
    this.status = status
    this.handlers.onStatus?.(status, detail)
  }

  /** End the call and release all resources. */
  close() {
    this.clearReconnect()
    this.stopQualityMonitor()
    // Stop the mirror canvas + any active screen-share so all extra tracks are released.
    if (this.mirrored) {
      void this.stopMirror()
    }
    if (this.sharing) {
      void this.stopScreenShare()
    }
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((t) => t.stop())
      this.screenStream = null
    }
    if (this.syntheticCleanup) {
      this.syntheticCleanup()
      this.syntheticCleanup = null
    }
    if (this.onlineListener) window.removeEventListener('online', this.onlineListener)
    if (this.offlineListener) window.removeEventListener('offline', this.offlineListener)
    if (this.localStream) {
      for (const t of this.localStream.getTracks()) t.stop()
      this.localStream = null
    }
    if (this.pc) {
      this.pc.ontrack = null
      this.pc.onicecandidate = null
      this.pc.onnegotiationneeded = null
      this.pc.oniceconnectionstatechange = null
      this.pc.onconnectionstatechange = null
      try {
        this.pc.close()
      } catch {
        /* ignore */
      }
      this.pc = null
    }
    this.senders = []
    this.peerPresent = false
    this.setStatus('ended')
  }
}

// Standalone media acquisition (used by call-room to show the local camera
// immediately on mount, independent of the signaling connection).
export type AcquiredMedia = {
  stream: MediaStream
  synthetic: boolean
  camEnabled: boolean
  cleanup: () => void
}

export async function acquireLocalMedia(
  facingMode: 'user' | 'environment' = 'user',
): Promise<AcquiredMedia> {
  const audioConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  }

  // Try video and audio SEPARATELY — if the user grants camera but denies mic
  // (or mic is in-use), getUserMedia({video, audio}) fails entirely. By trying
  // them separately, the camera works even without a mic.
  const combined = new MediaStream()
  const cleanups: Array<() => void> = []
  let hasVideo = false
  let hasAudio = false

  // 1. Try video.
  try {
    const vs = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: facingMode },
        width: { ideal: 640 },
        height: { ideal: 360 },
        frameRate: { ideal: 24, max: 30 },
      },
      audio: false,
    })
    for (const t of vs.getVideoTracks()) {
      combined.addTrack(t)
      hasVideo = true
    }
    cleanups.push(() => vs.getTracks().forEach((t) => t.stop()))
  } catch {
    // Camera denied/unavailable.
  }

  // 2. Try audio (separately — won't fail just because camera did).
  try {
    const as = await navigator.mediaDevices.getUserMedia({
      video: false,
      audio: audioConstraints,
    })
    for (const t of as.getAudioTracks()) {
      combined.addTrack(t)
      hasAudio = true
    }
    cleanups.push(() => as.getTracks().forEach((t) => t.stop()))
  } catch {
    // Mic denied/unavailable.
  }

  // 3. If we got at least video OR audio → return the real stream.
  if (hasVideo || hasAudio) {
    return {
      stream: combined,
      synthetic: false,
      camEnabled: hasVideo,
      cleanup: () => cleanups.forEach((fn) => fn()),
    }
  }

  // 4. Nothing at all → synthetic fallback (video + silent audio).
  const syn = createSyntheticStream()
  return {
    stream: syn.stream,
    synthetic: true,
    camEnabled: true,
    cleanup: syn.cleanup,
  }
}

/**
 * Build a synthetic MediaStream (animated canvas video + a SILENT audio track)
 * used as a last-resort fallback when real camera/mic are unavailable. The
 * canvas is ATTACHED to the DOM (off-screen) so captureStream reliably produces
 * frames.
 *
 * The silent audio track is IMPORTANT: it keeps the synthetic peer's
 * RTCPeerConnection transceiver layout SYMMETRIC with a real peer (audio +
 * video, in the same order). Without it, a video-only synthetic peer has 1
 * transceiver while a real peer has 2 → "m-lines order mismatch" errors on
 * renegotiation. The AudioContext close is made idempotent + its promise is
 * caught so the "Cannot close a closed AudioContext" error can't happen.
 */
export function createSyntheticStream(): {
  stream: MediaStream
  cleanup: () => void
} {
  const stream = new MediaStream()
  const canvas = document.createElement('canvas')
  canvas.width = 640
  canvas.height = 360
  canvas.style.cssText =
    'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;pointer-events:none'
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')!
  let raf = 0
  let t = 0
  let lastDrawAt = 0
  const draw = (now = 0) => {
    // This is only a fallback preview, so 12 fps is sufficient and avoids
    // spending a full display-refresh loop on a synthetic animation.
    if (now - lastDrawAt >= 1000 / 12) {
      t += 0.02
      const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
      g.addColorStop(0, `hsl(${(t * 30) % 360}, 70%, 45%)`)
      g.addColorStop(1, `hsl(${(t * 30 + 80) % 360}, 70%, 25%)`)
      ctx.fillStyle = g
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      ctx.font = 'bold 34px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('VuCall', canvas.width / 2, canvas.height / 2 - 6)
      ctx.font = '14px system-ui, sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.fillText('No camera — synthetic preview', canvas.width / 2, canvas.height / 2 + 24)
      lastDrawAt = now
    }
    raf = requestAnimationFrame(draw)
  }
  draw()
  const cs = (
    canvas as HTMLCanvasElement & {
      captureStream?: (fps?: number) => MediaStream
    }
  ).captureStream?.(30)
  if (cs) {
    for (const tr of cs.getVideoTracks()) stream.addTrack(tr)
  }
  // Silent audio track (so the synthetic stream has audio + video, symmetric
  // with a real camera stream — avoids m-line order mismatches).
  let audioCleanup = () => {}
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    const ac = new AC()
    const dest = ac.createMediaStreamDestination()
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    gain.gain.value = 0
    osc.connect(gain)
    gain.connect(dest)
    osc.start()
    for (const tr of dest.stream.getAudioTracks()) stream.addTrack(tr)
    audioCleanup = () => {
      try {
        osc.stop()
      } catch {
        /* ignore */
      }
      // ac.close() returns a promise that REJECTS if already closed — swallow
      // it to avoid an unhandled "Cannot close a closed AudioContext".
      ac.close().catch(() => {})
    }
  } catch {
    /* audio optional */
  }
  // Idempotent cleanup — safe to call more than once (manager.close + call-room
  // both call it).
  let done = false
  const cleanup = () => {
    if (done) return
    done = true
    cancelAnimationFrame(raf)
    audioCleanup()
    try {
      canvas.remove()
    } catch {
      /* ignore */
    }
  }
  return { stream, cleanup }
}
