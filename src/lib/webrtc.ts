'use client'

import type { Signaling } from './signaling'

// Public STUN servers. For production behind restrictive NATs/corporate
// firewalls, add TURN servers here (e.g. coturn) — without TURN, two peers
// behind symmetric NATs cannot establish a direct media path.
export const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
]

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

  // Reconnection bookkeeping
  private reconnectAttempts = 0
  private maxReconnectAttempts = 8
  private reconnecting = false
  private restartInProgress = false
  private disconnectedTimer: ReturnType<typeof setTimeout> | null = null
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
    const acq = prebuilt ?? (await acquireLocalMedia(this.mediaFacing))
    this.usingSynthetic = acq.synthetic
    if (acq.synthetic && acq.cleanup) {
      this.syntheticCleanup = acq.cleanup
    }
    const stream = acq.stream
    this.localStream = stream
    this.micEnabled = true
    this.camEnabled = stream.getVideoTracks().length > 0

    this.buildPeerConnection(stream)
    this.attachNetworkListeners()
    // Replay any signals that arrived while the peer connection was being set up.
    this.drainPendingSignals()

    // The polite peer (callee) has a partner already; the impolite peer
    // (caller) waits for `room:peer-joined` before flushing its offer.
    if (!this.polite) {
      this.setStatus('waiting', 'menunggu teman bergabung')
    } else {
      this.peerPresent = true
      this.setStatus('connecting')
    }
    return stream
  }

  private buildPeerConnection(stream: MediaStream) {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    this.pc = pc

    for (const track of stream.getTracks()) {
      const sender = pc.addTrack(track, stream)
      this.senders.push(sender)
    }

    pc.ontrack = (e) => {
      console.log('[vc] ontrack', e.track.kind, 'streams:', e.streams.length)
      const remote = e.streams[0]
      this.handlers.onRemoteStream?.(remote ?? null)
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
      } else {
        console.log('[vc] ICE gathering complete')
      }
    }

    // Perfect negotiation: drive outgoing offers from negotiationneeded.
    pc.onnegotiationneeded = async () => {
      // Skip the auto-negotiation when we're driving a manual ICE-restart offer
      // — otherwise we'd emit a second (non-restart) offer and cause glare.
      if (this.restartInProgress) return
      try {
        this.makingOffer = true
        await pc.setLocalDescription()
        if (this.peerPresent) {
          this.signaling.sendSignal('offer', pc.localDescription)
        } else {
          // Buffer until a peer shows up, then flush on peer-joined.
          this.pendingOffer = pc.localDescription
            ? (pc.localDescription.toJSON() as RTCSessionDescriptionInit)
            : null
        }
      } catch (err) {
        console.error('[webrtc] negotiation error:', err)
      } finally {
        this.makingOffer = false
      }
    }

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState
      console.log('[vc] ice state:', state, '| signaling:', pc.signalingState)
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
        if (msg.type === 'offer') {
          await pc.setLocalDescription()
          this.signaling.sendSignal('answer', pc.localDescription)
        }
      } else if (msg.type === 'ice') {
        try {
          await pc.addIceCandidate(msg.data as RTCIceCandidateInit)
        } catch (e) {
          if (!this.ignoreOffer) throw e
        }
      } else if (msg.type === 'renegotiate-request') {
        // The remote peer asked us to restart. Trigger an ICE restart.
        await this.restartConnection('remote-request')
      }
    } catch (err) {
      console.error('[webrtc] signal handling error:', err)
    }
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
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.setStatus('failed', reason)
      return
    }
    this.reconnecting = true
    this.reconnectAttempts += 1
    this.handlers.onReconnectAttempt?.(this.reconnectAttempts)
    this.setStatus('reconnecting', reason)
    const delay = Math.min(8000, 1000 * 2 ** (this.reconnectAttempts - 1))
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
    this.mediaFacing = this.mediaFacing === 'user' ? 'environment' : 'user'
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: this.mediaFacing },
        audio: false,
      })
      const newTrack = newStream.getVideoTracks()[0]
      if (!newTrack) return false
      const sender = this.senders.find((s) => s.track?.kind === 'video')
      if (sender) {
        await sender.replaceTrack(newTrack)
      }
      this.localStream.removeTrack(oldTrack)
      oldTrack.stop()
      this.localStream.addTrack(newTrack)
      newTrack.enabled = this.camEnabled
      return true
    } catch (e) {
      console.error('[webrtc] switchCamera failed:', e)
      return false
    }
  }

  getMicEnabled() {
    return this.micEnabled
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
    // Stop any active screen-share first so the display-media track is released.
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
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: audioConstraints,
    })
    return {
      stream,
      synthetic: false,
      camEnabled: stream.getVideoTracks().length > 0,
      cleanup: () => {},
    }
  } catch {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: audioConstraints,
      })
      return { stream, synthetic: false, camEnabled: false, cleanup: () => {} }
    } catch {
      const syn = createSyntheticStream()
      return {
        stream: syn.stream,
        synthetic: true,
        camEnabled: true,
        cleanup: syn.cleanup,
      }
    }
  }
}

/**
 * Build a synthetic MediaStream (animated canvas video + silent audio) used as
 * a last-resort fallback when real camera/mic are unavailable. The canvas is
 * ATTACHED to the DOM (off-screen) so captureStream reliably produces frames.
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
  const draw = () => {
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
      try {
        ac.close()
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* audio optional */
  }
  const cleanup = () => {
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
