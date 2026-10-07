'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  Camera,
  Check,
  Copy,
  Heart,
  Minimize2,
  MessageCircle,
  PhoneOff,
  Share2,
  Sparkles,
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
import { ChatPanel } from './chat-panel'
import { ReactionsOverlay } from './reactions-overlay'
import { QualityBars } from './quality-bars'
import { MinimizedPip } from './minimized-pip'
import { FilterMenu } from './filter-menu'

const QUICK_REACTIONS = ['❤️', '👍', '😂', '🔥', '👏']

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
    chatMessages,
    reactions,
    localFilter,
    networkQuality,
    chatOpen,
    minimized,
    unreadCount,
    setRoom,
    setStatus,
    setLocalStream,
    setRemoteStream,
    setMic,
    setCam,
    setReconnectAttempt,
    setError,
    startCallTimer,
    addChat,
    addReaction,
    removeReaction,
    setLocalFilter,
    setNetworkQuality,
    setChatOpen,
    setMinimized,
  } = useVCStore()

  const managerRef = useRef<CallManager | null>(null)
  const signalingRef = useRef<Signaling | null>(null)
  const pendingSignals = useRef<IncomingSignal[]>([])
  const [copied, setCopied] = useState(false)
  const [reactionTrayOpen, setReactionTrayOpen] = useState(false)
  const [filterMenuOpen, setFilterMenuOpen] = useState(false)

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
            onChat: (m) => {
              if (!disposed) addChat(m)
            },
            onReaction: (r) => {
              if (!disposed) addReaction(r)
            },
            onQuality: (q) => {
              if (!disposed) setNetworkQuality(q)
            },
          },
        )
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
    setMic(managerRef.current?.toggleMic() ?? false)
  }
  function handleToggleCam() {
    setCam(managerRef.current?.toggleCam() ?? false)
  }
  async function handleSwitchCamera() {
    await managerRef.current?.switchCamera()
  }
  function handleSendChat(text: string) {
    managerRef.current?.sendChat(text)
  }
  function handleReaction(emoji: string) {
    managerRef.current?.sendReaction(emoji)
    setReactionTrayOpen(false)
  }
  function handleSelectFilter(css: string) {
    setLocalFilter(css)
    setFilterMenuOpen(false)
  }
  function handleCapture() {
    const video = document.querySelector<HTMLVideoElement>(
      '[data-vc="remote"] video',
    )
    if (!video || !video.videoWidth) {
      toast({ title: 'Belum ada video untuk difoto.' })
      return
    }
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `vucall-${roomId}-${Date.now()}.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast({ title: 'Foto tersimpan', description: 'Snapshot panggilan diunduh.' })
    }, 'image/png')
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

  // ---- Minimized: floating PiP over a quiet background ----
  if (minimized) {
    return (
      <div className="relative flex h-[100dvh] w-full flex-col items-center justify-center gap-3 bg-zinc-950 text-center">
        <p className="text-lg font-semibold text-white/90">Panggilan berlangsung</p>
        <p className="max-w-xs text-sm text-white/50">
          Geser pip untuk memindahkan. Ketuk perbesar untuk kembali ke layar penuh.
        </p>
        <p className="font-mono uppercase tracking-wider text-white/40">{roomId}</p>
        <MinimizedPip
          localStream={localStream}
          remoteStream={remoteStream}
          quality={networkQuality}
          onExpand={() => setMinimized(false)}
          onEnd={handleEnd}
        />
      </div>
    )
  }

  // ---- Active call screen ----
  const featureBtn =
    'flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-black">
      {/* Remote video (full-bleed) */}
      <div data-vc="remote" className="absolute inset-0 h-full w-full">
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
      </div>

      {/* Reactions float over everything */}
      <ReactionsOverlay reactions={reactions} onDone={removeReaction} />

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
              <QualityBars quality={networkQuality} />
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
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? 'Tautan disalin' : 'Salin tautan'}
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Minimalkan"
                className="rounded-full bg-black/40 text-white hover:bg-black/60"
                onClick={() => setMinimized(true)}
              >
                <Minimize2 className="size-5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Waiting card (share link) */}
      {showWaiting && (
        <div className="absolute inset-x-0 bottom-40 z-10 flex justify-center px-4">
          <div className="w-full max-w-sm rounded-2xl bg-black/70 p-4 text-center text-white backdrop-blur">
            <p className="text-sm text-white/80">
              Bagikan tautan ini ke teman Anda lewat chat apa pun:
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

      {/* Local video PiP (with visual filter applied to the preview) */}
      <div
        data-vc="local"
        className="absolute right-3 top-16 z-10 aspect-[3/4] w-28 overflow-hidden rounded-2xl border border-white/20 bg-zinc-950 shadow-xl shadow-black/40 sm:w-40"
        style={{ filter: localFilter === 'none' ? undefined : localFilter }}
      >
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

      {/* Bottom controls: feature row + media controls */}
      <div className="absolute inset-x-0 bottom-6 z-10 flex flex-col items-center gap-3 px-4">
        {/* Feature row */}
        <div className="flex items-center gap-2">
          {/* Chat */}
          <div className="relative">
            <button
              type="button"
              aria-label="Buka pesan"
              aria-pressed={chatOpen}
              className={cn(featureBtn, chatOpen && 'bg-white/20')}
              onClick={() => setChatOpen(!chatOpen)}
            >
              <MessageCircle className="size-5" />
              {unreadCount > 0 && !chatOpen && (
                <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Reaction */}
          <div className="relative">
            <button
              type="button"
              aria-label="Kirim reaksi"
              aria-expanded={reactionTrayOpen}
              className={cn(featureBtn, reactionTrayOpen && 'bg-white/20')}
              onClick={() => setReactionTrayOpen((v) => !v)}
            >
              <Heart className="size-5" />
            </button>
            <AnimatePresence>
              {reactionTrayOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-black/80 p-1.5 backdrop-blur"
                >
                  {QUICK_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      aria-label={`Reaksi ${emoji}`}
                      className="flex size-9 items-center justify-center rounded-full transition hover:bg-white/15"
                      onClick={() => handleReaction(emoji)}
                    >
                      <span className="text-xl">{emoji}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Capture photo */}
          <button
            type="button"
            aria-label="Ambil foto"
            className={featureBtn}
            onClick={handleCapture}
          >
            <Camera className="size-5" />
          </button>

          {/* Filter */}
          <div className="relative">
            <button
              type="button"
              aria-label="Efek"
              aria-expanded={filterMenuOpen}
              className={cn(
                featureBtn,
                filterMenuOpen && 'bg-white/20',
                localFilter !== 'none' && 'text-primary',
              )}
              onClick={() => setFilterMenuOpen((v) => !v)}
            >
              <Sparkles className="size-5" />
            </button>
            {filterMenuOpen && (
              <FilterMenu
                current={localFilter}
                onSelect={handleSelectFilter}
                onClose={() => setFilterMenuOpen(false)}
              />
            )}
          </div>
        </div>

        {/* Media controls */}
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

      {/* Chat panel (slides in from the right) */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            key="chat"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
            className="absolute inset-y-0 right-0 z-30 h-full"
          >
            <ChatPanel
              messages={chatMessages}
              onSend={handleSendChat}
              onClose={() => setChatOpen(false)}
              peerName="Teman"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
