'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTheme } from 'next-themes'
import {
  ArrowLeft,
  Check,
  Copy,
  Eye,
  EyeOff,
  Home,
  Minimize2,
  Moon,
  PhoneOff,
  PictureInPicture2,
  Share2,
  Sun,
} from 'lucide-react'
import { Signaling, type IncomingSignal } from '@/lib/signaling'
import { CallManager, type CallStatus } from '@/lib/webrtc'
import { useVCStore } from '@/lib/vc-store'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { VideoTile } from './video-tile'
import { CallControls } from './call-controls'
import { ReconnectingOverlay } from './reconnecting-overlay'
import { CallTimer } from './call-timer'
import { QualityBars } from './quality-bars'

export function CallRoom() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const roomId = searchParams.get('room') || ''
  const { theme, setTheme } = useTheme()
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
  } = useVCStore()

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

        const manager = new CallManager(signaling, !res.youAreCaller, {
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
      onPeerLeft: () => managerRef.current?.onPeerLeft(),
      onSignal: (msg: IncomingSignal) => {
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
      // Exit native Picture-in-Picture if it's open.
      if (typeof document !== 'undefined' && document.pictureInPictureElement) {
        document.exitPictureInPicture().catch(() => {})
      }
      managerRef.current?.close()
      managerRef.current = null
      signaling.disconnect()
      signalingRef.current = null
      pendingSignals.current = []
    }
     
  }, [roomId])

  // Attach native Picture-in-Picture listeners to the remote <video> so the
  // toolbar reflects real OS PiP state (e.g. when the user closes the floating
  // window from the OS). Re-attach when the remote stream changes.
  useEffect(() => {
    if (typeof document === 'undefined') return
    let v: HTMLVideoElement | null
    const attach = () => {
      v = document.querySelector<HTMLVideoElement>('[data-vc="remote"] video')
      if (!v) return
      v.addEventListener('enterpictureinpicture', () => setPipActive(true))
      v.addEventListener('leavepictureinpicture', () => setPipActive(false))
    }
    // Wait a tick for the VideoTile to mount its <video> after remoteStream lands.
    const id = window.setTimeout(attach, 120)
    return () => {
      window.clearTimeout(id)
      if (v) {
        v.removeEventListener('enterpictureinpicture', () => setPipActive(true))
        v.removeEventListener('leavepictureinpicture', () => setPipActive(false))
      }
    }
     
  }, [remoteStream])

  function handleEnd() {
    if (typeof document !== 'undefined' && document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {})
    }
    managerRef.current?.close()
    signalingRef.current?.leaveRoom()
    router.push('/')
  }
  function handleToggleMic() {
    setMic(managerRef.current?.toggleMic() ?? false)
  }
  function handleToggleCam() {
    setCam(managerRef.current?.toggleCam() ?? false)
  }
  async function handleSwitchCamera() {
    await managerRef.current?.switchCamera()
  }

  /** Real, native Picture-in-Picture on the remote video (OS-level floating
   *  window that persists across tabs). NOT a fake in-app mini-player. */
  async function togglePiP() {
    if (typeof document === 'undefined') return
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture()
      } else {
        const v = document.querySelector<HTMLVideoElement>(
          '[data-vc="remote"] video',
        )
        if (!v) {
          toast({ title: 'Belum ada video untuk PiP.' })
          return
        }
        await v.requestPictureInPicture()
      }
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

  // ---- Active call screen (repo 3-pane layout, adapted 1:1) ----
  const navBtn =
    'relative flex items-center justify-center text-muted-foreground transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded'

  return (
    <div className="app-container relative flex h-[100dvh] w-full overflow-hidden bg-background">
      {/* Mode switch (theme toggle) */}
      <button
        type="button"
        aria-label="Ganti tema"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="mode-switch absolute left-4 top-5 z-40 flex size-9 items-center justify-center rounded-full bg-card vc-shadow"
      >
        {theme === 'dark' ? <Sun className="size-5 text-amber-400" /> : <Moon className="size-5 text-foreground" />}
      </button>

      {/* Left navigation rail */}
      <aside className="left-side hidden min-w-[120px] shrink-0 flex-col items-center justify-center p-4 sm:flex">
        <nav className="navigation flex flex-col gap-8 rounded-[10px] bg-card p-6 vc-shadow">
          <button type="button" aria-label="Leave call" className={navBtn} onClick={handleEnd}>
            <Home className="size-6" />
          </button>

          {/* Native Picture-in-Picture */}
          <button
            type="button"
            aria-label={pipActive ? 'Keluar dari Picture-in-Picture' : 'Picture-in-Picture'}
            aria-pressed={pipActive}
            className={cn(navBtn, pipActive && 'text-primary')}
            onClick={togglePiP}
          >
            <PictureInPicture2 className="size-6" />
          </button>

          {/* Hide / show self-view (like Instagram) */}
          <button
            type="button"
            aria-label={selfHidden ? 'Tampilkan kamera saya' : 'Sembunyikan kamera saya'}
            aria-pressed={selfHidden}
            className={cn(navBtn, selfHidden && 'text-primary')}
            onClick={() => setSelfHidden(!selfHidden)}
          >
            {selfHidden ? <EyeOff className="size-6" /> : <Eye className="size-6" />}
          </button>
        </nav>
      </aside>

      {/* Main: video area + bottom action bar */}
      <main className="app-main flex flex-1 flex-col px-4 pb-4 pt-16 sm:px-8 sm:pt-[72px]">
        <div className="video-call-wrapper relative w-full flex-1 overflow-hidden rounded-2xl bg-zinc-950">
          {/* Remote — a CENTERED SQUARE tile (forced 1:1 ratio, per the Instagram
              trick) so the square capture fills it with object-fit: cover and
              ZERO crop/distortion. (A full-bleed landscape container would
              crop the square feed into a thin horizontal band — looks stretched.) */}
          <div className="absolute inset-0 flex items-center justify-center p-3">
            <div
              data-vc="remote"
              className="relative aspect-square max-h-full max-w-full overflow-hidden rounded-2xl bg-zinc-950"
            >
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
              {remoteStream && (
                <span className="absolute bottom-3 right-3 z-10 rounded px-3 py-1 text-xs text-white vc-glass">
                  Teman
                </span>
              )}
            </div>
          </div>

          {/* Local self-view tile: SQUARE container + object-cover (Instagram
              crop trick). Hidden when selfHidden — replaced by a small "show"
              pill, exactly like Instagram's hide-self-view. */}
          {selfHidden ? (
            <button
              type="button"
              onClick={() => setSelfHidden(false)}
              className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-xs text-white backdrop-blur hover:bg-black/70"
            >
              <Eye className="size-4" />
              Tampilkan kamera
            </button>
          ) : (
            <div
              data-vc="local"
              className="absolute right-3 top-3 z-10 aspect-square w-28 overflow-hidden rounded-lg border border-white/20 bg-zinc-950 shadow-lg sm:w-40"
            >
              <VideoTile
                stream={localStream}
                mirror
                muted
                objectCover
                aria-label="You"
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
              <span className="absolute bottom-1 right-1 rounded px-2 py-0.5 text-[10px] text-white vc-glass">
                You
              </span>
            </div>
          )}

          {/* Top status overlay */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between p-4">
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
            <div className="flex items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 text-white">
              <span
                className={cn(
                  'inline-block size-2 rounded-full',
                  connected ? 'bg-emerald-400' : showReconnecting ? 'bg-amber-400' : 'bg-white/40',
                )}
              />
              <CallTimer startedAt={connected ? callStartedAt : null} running={connected} />
              <span className="text-white/40">·</span>
              <QualityBars quality={networkQuality} />
              <span className="font-mono text-xs uppercase tracking-wider text-white/80">{roomId}</span>
            </div>
            {/* PiP quick button (mobile, since the nav rail is hidden < sm) */}
            <div className="pointer-events-auto">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Picture-in-Picture"
                className={cn(
                  'rounded-full bg-black/40 text-white hover:bg-black/60 sm:hidden',
                  pipActive && 'text-primary',
                )}
                onClick={togglePiP}
              >
                <Minimize2 className="size-5" />
              </Button>
            </div>
          </div>

          {/* Waiting share card */}
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
        </div>

        {/* Bottom action bar */}
        <div className="mx-auto mt-4 flex w-full max-w-[500px] items-center justify-center">
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
      </main>
    </div>
  )
}
