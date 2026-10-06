'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Check, Copy, PhoneOff, Share2 } from 'lucide-react'
import { Signaling, type IncomingSignal } from '@/lib/signaling'
import { CallManager, type CallStatus } from '@/lib/webrtc'
import { useVCStore } from '@/lib/vc-store'
import { Button } from '@/components/ui/button'
import { VideoTile } from './video-tile'
import { CallControls } from './call-controls'
import { ReconnectingOverlay } from './reconnecting-overlay'
import { CallTimer } from './call-timer'
import { cn } from '@/lib/utils'

export function CallRoom() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const roomId = searchParams.get('room') || ''

  const store = useVCStore()
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
    setRoom,
    setStatus,
    setLocalStream,
    setRemoteStream,
    setMic,
    setCam,
    setReconnectAttempt,
    setError,
    startCallTimer,
  } = store

  const managerRef = useRef<CallManager | null>(null)
  const signalingRef = useRef<Signaling | null>(null)
  const pendingSignals = useRef<IncomingSignal[]>([])
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!roomId) return
    let disposed = false

    const signaling = new Signaling({
      onConnect: async () => {
        if (disposed) return
        const res = await signaling.joinRoom(roomId)
        if (disposed) return
        if (!res.ok) {
          setError('Ruangan penuh atau tidak valid.')
          setStatus('failed', 'room-full')
          return
        }
        setRoom(roomId, res.youAreCaller ? 'caller' : 'callee')

        const manager = new CallManager(
          signaling,
          !res.youAreCaller, // polite = callee
          {
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
          },
        )
        managerRef.current = manager

        // Drain any signals that arrived before the manager was ready.
        for (const m of pendingSignals.current) {
          void manager.handleSignal(m)
        }
        pendingSignals.current = []

        const stream = await manager.start()
        if (disposed) {
          manager.close()
          return
        }
        if (stream) setLocalStream(stream)
      },
      onPeerJoined: () => managerRef.current?.onPeerJoined(),
      onPeerLeft: () => {
        managerRef.current?.onPeerLeft()
      },
      onSignal: (msg: IncomingSignal) => {
        // Buffer if manager not ready yet, else dispatch immediately.
        if (managerRef.current) {
          void managerRef.current.handleSignal(msg)
        } else {
          pendingSignals.current.push(msg)
        }
      },
      onRoomFull: () => {
        if (disposed) return
        setError('Ruangan penuh. Coba buat ruangan baru.')
        setStatus('failed', 'room-full')
      },
    })
    signalingRef.current = signaling
    signaling.connect()

    return () => {
      disposed = true
      managerRef.current?.close()
      managerRef.current = null
      signaling.disconnect()
      signalingRef.current = null
      pendingSignals.current = []
    }
     
  }, [roomId])

  function handleEnd() {
    managerRef.current?.close()
    signalingRef.current?.leaveRoom()
    router.push('/')
  }

  function handleToggleMic() {
    const on = managerRef.current?.toggleMic() ?? false
    setMic(on)
  }
  function handleToggleCam() {
    const on = managerRef.current?.toggleCam() ?? false
    setCam(on)
  }
  async function handleSwitchCamera() {
    await managerRef.current?.switchCamera()
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

  const connected = status === 'connected'
  const showWaiting = status === 'waiting'
  const showReconnecting = status === 'reconnecting'
  const showFailed = status === 'failed'
  const showEnded = status === 'ended' && !remoteStream
  const requestingMedia = status === 'requesting-media'

  // ---- Failed / Ended screens ----
  if (showFailed || showEnded) {
    const isEnded = status === 'ended'
    return (
      <div className="flex h-[100dvh] w-full flex-col items-center justify-center gap-4 bg-background p-6 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-muted">
          <PhoneOff className="size-7 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-semibold">
          {isEnded ? 'Panggilan berakhir' : 'Tidak dapat memulai panggilan'}
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          {isEnded
            ? 'Teman Anda telah meninggalkan panggilan.'
            : error ||
              'Terjadi masalah saat menghubungkan. Silakan coba lagi.'}
        </p>
        <Button onClick={() => router.push('/')} className="mt-2 gap-2 rounded-full">
          <ArrowLeft className="size-4" />
          Kembali ke lobby
        </Button>
      </div>
    )
  }

  // ---- Active call screen (requesting / waiting / connecting / connected / reconnecting) ----
  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-black">
      {/* Remote video (full-bleed) */}
      <VideoTile
        stream={remoteStream}
        objectCover
        muted={false}
        aria-label="Remote participant"
        className="h-full w-full"
        placeholder={
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-b from-zinc-900 to-black text-center">
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

      {/* Top status bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="pointer-events-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Leave call"
              className="rounded-full bg-black/40 text-white hover:bg-black/60"
              onClick={handleEnd}
            >
              <ArrowLeft className="size-5" />
            </Button>
          </div>
          <div className="flex flex-col items-center text-white">
            <span className="text-sm font-semibold">VuCall</span>
            <span className="flex items-center gap-1.5 text-xs text-white/80">
              <span
                className={cn(
                  'inline-block size-2 rounded-full',
                  connected
                    ? 'bg-emerald-400'
                    : showReconnecting
                      ? 'bg-amber-400'
                      : 'bg-white/40',
                )}
              />
              <CallTimer startedAt={connected ? callStartedAt : null} running={connected} />
              <span className="text-white/50">·</span>
              <span className="font-mono uppercase tracking-wider">{roomId}</span>
            </span>
          </div>
          <div className="pointer-events-auto">
            {showWaiting ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={copyLink}
                className="gap-1.5 rounded-full bg-black/40 text-white hover:bg-black/60"
              >
                {copied ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
                {copied ? 'Tautan disalin' : 'Salin tautan'}
              </Button>
            ) : (
              <span className="w-9" />
            )}
          </div>
        </div>
      </div>

      {/* Waiting card (share link) */}
      {showWaiting && (
        <div className="absolute inset-x-0 bottom-32 z-10 flex justify-center px-4">
          <div className="w-full max-w-sm rounded-2xl bg-black/70 p-4 text-center text-white backdrop-blur">
            <p className="text-sm text-white/80">
              Bagikan tautan ini ke teman Anda lewat Instagram, WhatsApp, atau apa pun:
            </p>
            <div className="mt-2 break-all rounded-lg bg-white/10 px-3 py-2 text-xs font-mono">
              {typeof window !== 'undefined' ? window.location.href : `/?room=${roomId}`}
            </div>
            <Button
              onClick={copyLink}
              size="sm"
              className="mt-3 w-full gap-2 rounded-full"
              variant="secondary"
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? 'Tautan disalin!' : 'Salin tautan'}
            </Button>
          </div>
        </div>
      )}

      {/* Local video PiP */}
      <div className="absolute right-3 top-16 z-10 aspect-[3/4] w-28 overflow-hidden rounded-2xl border border-white/20 bg-zinc-950 shadow-xl shadow-black/40 sm:w-40">
        <VideoTile
          stream={localStream}
          mirror
          muted
          objectCover={false}
          aria-label="You"
          className="h-full w-full"
          placeholder={
            <div className="flex h-full w-full items-center justify-center bg-zinc-900">
              <span className="size-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            </div>
          }
        />
      </div>

      {/* Reconnecting overlay (never drops the call) */}
      <ReconnectingOverlay
        visible={showReconnecting}
        attempt={reconnectAttempt || undefined}
        reason={showReconnecting ? statusDetail : undefined}
      />

      {/* Bottom controls */}
      <div className="absolute inset-x-0 bottom-6 z-10 flex justify-center px-4">
        <CallControls
          micOn={micOn}
          camOn={camOn}
          onToggleMic={handleToggleMic}
          onToggleCam={handleToggleCam}
          onSwitchCamera={handleSwitchCamera}
          onEnd={handleEnd}
          canSwitchCamera
        />
      </div>
    </div>
  )
}
