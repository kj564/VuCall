'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  Check,
  Circle,
  Copy,
  Eye,
  EyeOff,
  FlipHorizontal,
  Minimize2,
  PhoneOff,
  Share2,
  Square,
} from 'lucide-react'
import { Signaling, type IncomingSignal } from '@/lib/signaling'
import { CallManager, acquireLocalMedia, type AcquiredMedia, type CallStatus } from '@/lib/webrtc'
import { useVCStore } from '@/lib/vc-store'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { VideoTile } from './video-tile'
import { CallControls } from './call-controls'
import { ReconnectingOverlay } from './reconnecting-overlay'
import { CallTimer } from './call-timer'
import { QualityBars } from './quality-bars'
import { PreJoin } from './pre-join'

// iOS Safari exposes Picture-in-Picture via webkit-prefixed methods that
// aren't in the standard lib typings.
type IOSVideo = HTMLVideoElement & {
  webkitRequestPictureInPicture?: () => Promise<unknown> | void
  webkitSetPresentationMode?: (mode: 'picture-in-picture' | 'inline') => void
  webkitPresentationMode?: string
  webkitSupportsPictureInPicture?: boolean
}

/** Enter native Picture-in-Picture on a video, trying the standard API first
 *  then the iOS webkit variants. Returns true on success. */
async function enterPiP(v: HTMLVideoElement): Promise<boolean> {
  const el = v as IOSVideo
  // Standard API (Chrome/Firefox/desktop Safari).
  if (
    typeof document !== 'undefined' &&
    document.pictureInPictureEnabled &&
    typeof el.requestPictureInPicture === 'function'
  ) {
    try {
      await el.requestPictureInPicture()
      return true
    } catch {
      /* fall through to webkit */
    }
  }
  // iOS Safari webkit API.
  if (
    el.webkitSupportsPictureInPicture &&
    typeof el.webkitRequestPictureInPicture === 'function'
  ) {
    try {
      await (el.webkitRequestPictureInPicture as () => Promise<unknown>)()
      return true
    } catch {
      /* fall through */
    }
  }
  if (typeof el.webkitSetPresentationMode === 'function') {
    try {
      el.webkitSetPresentationMode('picture-in-picture')
      return true
    } catch {
      /* ignore */
    }
  }
  return false
}

export function CallRoom() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const roomId = searchParams.get('room') || ''
  const { toast } = useToast()

  const {
    status,
    statusDetail,
    localStream,
    remoteStream,
    micOn,
    camOn,
    reconnectAttempt,
    error,
    callStartedAt,
    networkQuality,
    pipActive,
    selfHidden,
    sharing,
    fullscreen,
    mirror,
    facing,
    recording,
    setRoom,
    setStatus,
    setLocalStream,
    setRemoteStream,
    setMic,
    setCam,
    setReconnectAttempt,
    setError,
    startCallTimer,
    setNetworkQuality,
    setPipActive,
    setSelfHidden,
    setSharing,
    setFullscreen,
    setMirror,
    setFacing,
    setRecording,
  } = useVCStore()

  // Derived status flags (declared up-front so the effects below can reference
  // them without hitting the temporal dead zone).
  const connected = status === 'connected'
  const showWaiting = status === 'waiting'
  const showReconnecting = status === 'reconnecting'
  const showFailed = status === 'failed'
  const showEnded = status === 'ended' && !remoteStream
  const requestingMedia = status === 'requesting-media'

  const managerRef = useRef<CallManager | null>(null)
  const signalingRef = useRef<Signaling | null>(null)
  const pendingSignals = useRef<IncomingSignal[]>([])
  const wrapperRef = useRef<HTMLDivElement>(null)
  const mediaRef = useRef<AcquiredMedia | null>(null)
  const mediaCleanupRef = useRef<(() => void) | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const camOnRef = useRef(camOn)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const [copied, setCopied] = useState(false)
  const [joined, setJoined] = useState(false)

  // Keep a ref in sync with the store's localStream so toggle handlers (which
  // run during pre-join, before the manager exists) can flip track.enabled.
  useEffect(() => {
    localStreamRef.current = localStream
  }, [localStream])

  // Keep camOn in a ref so the visibilitychange listener reads the latest value
  // without re-attaching on every toggle.
  useEffect(() => {
    camOnRef.current = camOn
  }, [camOn])

  // Acquire local media on mount (for the pre-join preview + reuse when joined).
  // Done BEFORE signaling so the user sees their camera instantly, independent
  // of the signaling socket (which may be slow/blocked in an iframe).
  useEffect(() => {
    if (!roomId) return
    let disposed = false
    void acquireLocalMedia().then((acq) => {
      if (disposed) {
        acq.cleanup()
        return
      }
      mediaRef.current = acq
      mediaCleanupRef.current = acq.cleanup
      setLocalStream(acq.stream)
      setCam(acq.camEnabled)
    })
    return () => {
      disposed = true
      mediaCleanupRef.current?.()
      mediaCleanupRef.current = null
      mediaRef.current = null
    }
  }, [roomId])

  // Connect MQTT signaling after "Join call". The CallManager is created when
  // a peer is DISCOVERED (onPeerJoined) — serverless, symmetric glare.
  useEffect(() => {
    if (!roomId || !joined) return
    let disposed = false

    const createManager = (polite: boolean) => {
      if (managerRef.current || disposed) return
      const manager = new CallManager(signaling, polite, {
        onRemoteStream: (s) => {
          if (!disposed) setRemoteStream(s)
        },
        onStatus: (st: CallStatus, detail?: string) => {
          if (disposed) return
          setStatus(st, detail)
          if (st === 'connected') startCallTimer()
        },
        onReconnectAttempt: (n: number) => {
          if (!disposed) setReconnectAttempt(n)
        },
        onError: (m: string) => {
          if (!disposed) setError(m)
        },
        onQuality: (q) => {
          if (!disposed) setNetworkQuality(q)
        },
      })
      managerRef.current = manager
      // Drain any signals that arrived before the manager was ready.
      for (const m of pendingSignals.current) {
        void manager.handleSignal(m)
      }
      pendingSignals.current = []
      // Reuse the media acquired during pre-join.
      void manager.start(mediaRef.current ?? undefined).then(() => {
        if (disposed) {
          manager.close()
          return
        }
        if (mirror && manager.getFacing() === 'user') {
          void manager.setMirrored(true)
        }
        const ls = manager.getLocalStream()
        if (ls) setLocalStream(ls)
      })
    }

    const signaling = new Signaling({
      onConnect: () => {
        if (disposed) return
        setStatus('waiting', 'menunggu teman bergabung')
      },
      onPeerJoined: (info: { from: string; polite: boolean }) => {
        if (disposed) return
        setRoom(roomId, info.polite ? 'callee' : 'caller')
        createManager(info.polite)
      },
      onPeerLeft: () => {
        managerRef.current?.onPeerLeft()
      },
      onSignal: (msg: IncomingSignal) => {
        if (managerRef.current) {
          void managerRef.current.handleSignal(msg)
        } else {
          pendingSignals.current.push(msg)
        }
      },
    })
    signalingRef.current = signaling
    signaling.connect()
    void signaling.joinRoom(roomId)

    return () => {
      disposed = true
      if (typeof document !== 'undefined' && document.pictureInPictureElement) {
        document.exitPictureInPicture().catch(() => {})
      }
      if (typeof document !== 'undefined' && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }
      managerRef.current?.close()
      managerRef.current = null
      signaling.leaveRoom()
      signaling.disconnect()
      signalingRef.current = null
      pendingSignals.current = []
    }
     
  }, [roomId, joined])

  // Attach native Picture-in-Picture listeners to the remote <video> so the
  // toolbar reflects real OS PiP state (e.g. when the user closes the floating
  // window from the OS). Re-attach when the remote stream changes.
  // Fix: use STABLE named handlers (not inline arrows) so removeEventListener
  // actually matches the ones added (audit finding: memory leak from mismatched
  // arrow functions).
  const onEnterPiP = React.useRef(() => {})
  const onLeavePiP = React.useRef(() => {})
  useEffect(() => {
    onEnterPiP.current = () => setPipActive(true)
    onLeavePiP.current = () => setPipActive(false)
  }, [])
  useEffect(() => {
    if (typeof document === 'undefined') return
    let v: HTMLVideoElement | null
    const attach = () => {
      v = document.querySelector<HTMLVideoElement>('[data-vc="remote"] video')
      if (!v) return
      v.addEventListener('enterpictureinpicture', onEnterPiP.current)
      v.addEventListener('leavepictureinpicture', onLeavePiP.current)
    }
    const id = window.setTimeout(attach, 120)
    return () => {
      window.clearTimeout(id)
      if (v) {
        v.removeEventListener('enterpictureinpicture', onEnterPiP.current)
        v.removeEventListener('leavepictureinpicture', onLeavePiP.current)
      }
    }
     
  }, [remoteStream])

  // Track native full-screen state so the button reflects reality (e.g. when
  // the user exits via Esc).
  useEffect(() => {
    if (typeof document === 'undefined') return
    const onFsChange = () =>
      setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  // FaceTime/WhatsApp-style background handling:
  // 1. Try native Picture-in-Picture (floats over other apps like FaceTime).
  // 2. If PiP fails/unsupported (iOS Safari), disable the LOCAL video track to
  //    save battery + bandwidth — audio continues (like WhatsApp Web). When the
  //    user returns, restore video if it was on.
  useEffect(() => {
    if (typeof document === 'undefined') return
    const onVis = async () => {
      if (!connected) return
      if (document.hidden) {
        // Page hidden — try PiP first (FaceTime-like floating window).
        if (!document.pictureInPictureElement) {
          const v = document.querySelector<HTMLVideoElement>('[data-vc="remote"] video')
          if (v) {
            const ok = await enterPiP(v).catch(() => false)
            if (ok) return // PiP succeeded — video continues in the floating window.
          }
        }
        // PiP failed/unsupported — disable local video (audio continues).
        const videoTrack = localStreamRef.current?.getVideoTracks()[0]
        if (videoTrack) videoTrack.enabled = false
      } else {
        // Page visible again — restore video if it was on.
        const videoTrack = localStreamRef.current?.getVideoTracks()[0]
        if (videoTrack && camOnRef.current) videoTrack.enabled = true
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
     
  }, [connected])

  function handleEnd() {
    // Stop recording if active.
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop()
    }
    if (typeof document !== 'undefined') {
      if (document.pictureInPictureElement) {
        document.exitPictureInPicture().catch(() => {})
      }
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }
    }
    managerRef.current?.close()
    signalingRef.current?.leaveRoom()
    router.push('/')
  }

  /** Mic/camera toggles work in BOTH pre-join (no manager yet) and in-call:
   *  flip the localStream track's `enabled` (the source of truth for what's
   *  sent) + sync the store. */
  function handleToggleMic() {
    const t = localStreamRef.current?.getAudioTracks()[0]
    const next = t ? !t.enabled : !micOn
    if (t) t.enabled = next
    setMic(next)
  }
  function handleToggleCam() {
    const t = localStreamRef.current?.getVideoTracks()[0]
    const next = t ? !t.enabled : !camOn
    if (t) t.enabled = next
    setCam(next)
  }
  async function handleSwitchCamera() {
    await managerRef.current?.switchCamera()
    setFacing(managerRef.current?.getFacing() ?? 'user')
    // After switching, re-apply the mirror canvas if the front cam + setting on.
    const m = managerRef.current
    if (m) {
      await m.setMirrored(mirror && m.getFacing() === 'user' && !sharing)
      const ls = m.getLocalStream()
      if (ls) setLocalStream(ls)
    }
  }

  /** Toggle the front-camera mirror — applies a canvas pipeline so the SENT
   *  stream (not just the local preview) is mirrored. Back camera is never
   *  mirrored. */
  async function handleToggleMirror() {
    const next = !mirror
    setMirror(next)
    const m = managerRef.current
    if (m && facing === 'user' && !sharing) {
      await m.setMirrored(next)
      const ls = m.getLocalStream()
      if (ls) setLocalStream(ls)
    }
  }

  /** Instagram "Join call" — proceed from the pre-join screen into the call. */
  function handleJoin() {
    setJoined(true)
  }

  /** "Test speaker" — play a short audible tone so the user can verify their
   *  output device before joining. */
  function handleTestSpeaker() {
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext
      const ac = new AC()
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      gain.gain.value = 0.18
      osc.frequency.value = 440
      osc.connect(gain)
      gain.connect(ac.destination)
      osc.start()
      window.setTimeout(() => {
        try {
          osc.stop()
        } catch {
          /* ignore */
        }
        // ac.close() returns a promise that rejects if already closed —
        // swallow it to avoid an unhandled "Cannot close a closed
        // AudioContext" rejection.
        ac.close().catch(() => {})
      }, 1200)
    } catch {
      /* AudioContext unavailable */
    }
  }

  /** "Share your screen" — swap the video sender's track for a display-media
   *  track. When sharing STOPS, re-apply the mirror canvas if the setting is on
   *  (front cam) so the sent stream stays mirrored. */
  async function handleToggleScreenShare() {
    const wasSharing = managerRef.current?.isScreenSharing() ?? false
    const ok = await managerRef.current?.toggleScreenShare()
    const nowSharing = managerRef.current?.isScreenSharing() ?? false
    setSharing(nowSharing)
    if (!ok && !wasSharing) {
      toast({ title: 'Tidak dapat berbagi layar.', description: 'Izinkan akses layar.' })
    }
    // If we just STOPPED sharing, restore the mirror canvas if applicable.
    const m = managerRef.current
    if (m && wasSharing && !nowSharing && mirror && m.getFacing() === 'user') {
      await m.setMirrored(true)
      const ls = m.getLocalStream()
      if (ls) setLocalStream(ls)
    } else if (m) {
      const ls = m.getLocalStream()
      if (ls) setLocalStream(ls)
    }
  }

  /** "Enter full screen" on the video wrapper (native Fullscreen API). */
  async function handleToggleFullscreen() {
    const el = wrapperRef.current
    if (!el) return
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await el.requestFullscreen()
      }
    } catch {
      /* fullscreen may be blocked — ignore */
    }
  }

  /** Call recording — MediaRecorder on the remote stream → download .webm. */
  function handleToggleRecording() {
    if (recording) {
      recorderRef.current?.stop()
      return
    }
    const remoteVideo = document.querySelector<HTMLVideoElement>('[data-vc="remote"] video')
    const stream = remoteVideo?.srcObject as MediaStream | undefined
    if (!stream) {
      toast({ title: 'Belum ada video untuk direkam.' })
      return
    }
    try {
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : 'video/webm'
      const mr = new MediaRecorder(stream, { mimeType })
      chunksRef.current = []
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `vucall-recording-${Date.now()}.webm`
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
        setRecording(false)
        toast({ title: 'Rekaman tersimpan', description: 'File .webm diunduh.' })
      }
      mr.start(1000)
      recorderRef.current = mr
      setRecording(true)
    } catch {
      toast({ title: 'Rekaman tidak didukung di browser ini.' })
    }
  }

  /** Real, native Picture-in-Picture on the remote video (OS-level floating
   *  window that persists across tabs/apps — like FaceTime/WhatsApp on iOS).
   *  Tries the standard API then the iOS webkit variants. */
  async function togglePiP() {
    if (typeof document === 'undefined') return
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture()
        return
      }
      const v = document.querySelector<HTMLVideoElement>('[data-vc="remote"] video') as IOSVideo | null
      if (v && v.webkitPresentationMode === 'picture-in-picture' && typeof v.webkitSetPresentationMode === 'function') {
        v.webkitSetPresentationMode('inline')
        return
      }
      if (!v) {
        toast({ title: 'Belum ada video untuk PiP.' })
        return
      }
      const ok = await enterPiP(v)
      if (!ok) toast({ title: 'PiP tidak didukung di browser ini.' })
    } catch {
      toast({ title: 'PiP tidak didukung di browser ini.' })
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  // ---- Pre-join screen (Instagram-style device setup before "Join call") ----
  if (!joined && !showFailed && !showEnded) {
    return (
      <PreJoin
        localStream={localStream}
        micOn={micOn}
        camOn={camOn}
        mirror={mirror}
        roomId={roomId}
        onToggleMic={handleToggleMic}
        onToggleCam={handleToggleCam}
        onToggleMirror={handleToggleMirror}
        onTestSpeaker={handleTestSpeaker}
        onJoin={handleJoin}
        copied={copied}
        onCopyLink={copyLink}
      />
    )
  }

  // ---- Failed / Ended screens ----
  if (showFailed || showEnded) {
    const isEnded = status === 'ended'
    return (
      <div className="flex h-[100dvh] w-full flex-col items-center justify-center gap-4 bg-background p-6 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-card vc-shadow">
          <PhoneOff className="size-7 text-destructive" />
        </div>
        <h1 className="text-xl font-bold">
          {isEnded ? 'Panggilan berakhir' : 'Tidak dapat memulai panggilan'}
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          {isEnded
            ? 'Teman Anda telah meninggalkan panggilan.'
            : error || 'Terjadi masalah saat menghubungkan. Silakan coba lagi.'}
        </p>
        <Button onClick={() => router.push('/')} className="mt-2 gap-2 rounded-lg">
          <ArrowLeft className="size-4" />
          Kembali ke lobby
        </Button>
      </div>
    )
  }

  // ---- Active call screen (simple, Instagram-like: full-screen video + a
  //  minimal top bar with leave / status / mirror / PiP, and a bottom control
  //  bar). No left nav rail, no in-call theme toggle. ----
  return (
    <div className="relative flex h-[100dvh] w-full overflow-hidden bg-background">
      {/* Instagram-clean in-call: full-bleed remote video + a small local PiP
          (top-right) + two tiny utility buttons (top-left: mirror, PiP) + a
          floating bottom control bar. No status pill, no leave button (End
          call = leave), no theme toggle. Edge-to-edge video, no rounding. */}
      <div ref={wrapperRef} className="relative h-[100dvh] w-full overflow-hidden bg-black">
        {/* Remote — full-bleed, object-contain (full frame, black bars OK) */}
        <div data-vc="remote" className="absolute inset-0">
          <VideoTile
            stream={remoteStream}
            objectCover={false}
            muted={false}
            aria-label="Remote participant"
            className="h-full w-full"
            placeholder={
              <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-black text-center">
                <div className="flex size-20 items-center justify-center rounded-full bg-white/10">
                  {showWaiting ? (
                    <Share2 className="size-9 text-white/80" />
                  ) : (
                    <span className="size-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  )}
                </div>
                <p className="text-sm font-medium text-white/90">
                  {showWaiting
                    ? 'Menunggu teman Anda bergabung…'
                    : requestingMedia
                      ? 'Menyiapkan kamera & mikrofon…'
                      : 'Menghubungkan…'}
                </p>
              </div>
            }
          />
        </div>

        {/* Local self-view PiP — small portrait rounded tile, top-right.
            Hidden when selfHidden (replaced by a small "show" pill). */}
        {selfHidden ? (
          <button
            type="button"
            onClick={() => setSelfHidden(false)}
            className="absolute right-3 top-3 z-20 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-xs text-white backdrop-blur hover:bg-black/70"
          >
            <Eye className="size-4" />
            Tampilkan kamera
          </button>
        ) : (
          <div
            data-vc="local"
            className="absolute right-3 top-3 z-20 aspect-[3/4] w-24 overflow-hidden rounded-2xl border border-white/15 bg-black shadow-xl shadow-black/50 sm:w-28"
          >
            <VideoTile
              stream={localStream}
              mirror={false}
              muted
              objectCover={false}
              aria-label={
                sharing ? 'Your screen share' : `Your video, microphone ${micOn ? 'on' : 'off'}`
              }
              className="h-full w-full"
              placeholder={
                <div className="flex h-full w-full items-center justify-center bg-zinc-900">
                  <span className="size-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                </div>
              }
            />
            <button
              type="button"
              aria-label="Sembunyikan kamera saya"
              onClick={() => setSelfHidden(true)}
              className="absolute right-1 top-1 z-10 flex size-6 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur hover:bg-black/70"
            >
              <EyeOff className="size-3.5" />
            </button>
          </div>
        )}

        {/* Top-left utility buttons (tiny, subtle): mirror + PiP + record */}
        <div className="absolute left-3 top-3 z-20 flex flex-col gap-2">
          <button
            type="button"
            aria-label={mirror ? 'Nonaktifkan mirror kamera depan' : 'Aktifkan mirror kamera depan'}
            aria-pressed={mirror && facing === 'user'}
            title="Mirror kamera depan"
            onClick={handleToggleMirror}
            disabled={facing !== 'user' || sharing}
            className={cn(
              'flex size-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/60 disabled:opacity-30',
              mirror && facing === 'user' && !sharing && 'text-primary',
            )}
          >
            <FlipHorizontal className="size-5" />
          </button>
          <button
            type="button"
            aria-label={pipActive ? 'Keluar dari Picture-in-Picture' : 'Picture-in-Picture'}
            aria-pressed={pipActive}
            title="Picture-in-Picture"
            onClick={togglePiP}
            className={cn(
              'flex size-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/60',
              pipActive && 'text-primary',
            )}
          >
            <Minimize2 className="size-5" />
          </button>
          <button
            type="button"
            aria-label={recording ? 'Stop recording' : 'Record call'}
            aria-pressed={recording}
            title="Rekam panggilan"
            onClick={handleToggleRecording}
            className={cn(
              'flex size-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/60',
              recording && 'bg-red-600 text-white',
            )}
          >
            {recording ? <Square className="size-4" /> : <Circle className="size-4" />}
          </button>
        </div>

        {/* Minimal timer + recording indicator (top-center, subtle) */}
        {connected && (
          <div className="absolute top-3 left-1/2 z-20 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-0.5 text-xs text-white/80 backdrop-blur">
            <span
              className={cn(
                'inline-block size-1.5 rounded-full',
                recording ? 'bg-red-500 animate-pulse' : 'bg-emerald-400',
              )}
            />
            <CallTimer startedAt={callStartedAt} running={connected} />
            {recording && <span className="text-red-400">REC</span>}
          </div>
        )}

        {/* Waiting share card (only while alone) */}
        {showWaiting && (
          <div className="absolute inset-x-0 bottom-24 z-10 flex justify-center px-4">
            <div className="w-full max-w-sm rounded-2xl bg-black/70 p-4 text-center text-white backdrop-blur">
              <p className="text-sm text-white/80">Bagikan tautan ini ke teman Anda lewat chat apa pun:</p>
              <div className="mt-2 break-all rounded-lg bg-white/10 px-3 py-2 text-xs font-mono">
                {typeof window !== 'undefined' ? window.location.href : `/?room=${roomId}`}
              </div>
              <Button onClick={copyLink} size="sm" className="mt-3 w-full gap-2 rounded-lg">
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? 'Tautan disalin!' : 'Salin tautan'}
              </Button>
            </div>
          </div>
        )}

        <ReconnectingOverlay
          visible={showReconnecting}
          attempt={reconnectAttempt || undefined}
          reason={showReconnecting ? statusDetail : undefined}
        />

        {/* Floating bottom control bar (Instagram-style: circular buttons, centered) */}
        <div className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2">
          <CallControls
            micOn={micOn}
            camOn={camOn}
            sharing={sharing}
            fullscreen={fullscreen}
            onToggleMic={handleToggleMic}
            onToggleCam={handleToggleCam}
            onToggleScreenShare={handleToggleScreenShare}
            onToggleFullscreen={handleToggleFullscreen}
            onSwitchCamera={handleSwitchCamera}
            onEnd={handleEnd}
            canSwitchCamera
          />
        </div>
      </div>
    </div>
  )
}
