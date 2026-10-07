'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import {
  ArrowLeft,
  Camera,
  Check,
  Copy,
  Home,
  MessageCircle,
  Minimize2,
  Moon,
  PhoneOff,
  Share2,
  Smile,
  Sparkles,
  Sun,
  X,
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

    // Default chat panel open on desktop, closed on mobile.
    if (typeof window !== 'undefined') {
      setChatOpen(window.innerWidth >= 1024)
    }

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
          !res.youAreCaller,
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

  // ---- Minimized: floating PiP over a quiet background ----
  if (minimized) {
    return (
      <div className="relative flex h-[100dvh] w-full flex-col items-center justify-center gap-3 bg-background text-center">
        <p className="text-lg font-bold">Panggilan berlangsung</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          Geser pip untuk memindahkan. Ketuk perbesar untuk kembali ke layar penuh.
        </p>
        <p className="font-mono uppercase tracking-wider text-muted-foreground">{roomId}</p>
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
          <button
            type="button"
            aria-label="Buka pesan"
            aria-pressed={chatOpen}
            className={cn(navBtn, chatOpen && 'text-primary')}
            onClick={() => setChatOpen(!chatOpen)}
          >
            <MessageCircle className="size-6" />
            {unreadCount > 0 && !chatOpen && (
              <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Reaction */}
          <div className="relative">
            <button
              type="button"
              aria-label="Kirim reaksi"
              aria-expanded={reactionTrayOpen}
              className={cn(navBtn, reactionTrayOpen && 'text-primary')}
              onClick={() => setReactionTrayOpen((v) => !v)}
            >
              <Smile className="size-6" />
            </button>
            <AnimatePresence>
              {reactionTrayOpen && (
                <motion.div
                  initial={{ opacity: 0, x: -10, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -10, scale: 0.95 }}
                  className="absolute left-full top-0 ml-2 flex items-center gap-1 rounded-full bg-card p-1.5 vc-shadow"
                >
                  {QUICK_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      aria-label={`Reaksi ${emoji}`}
                      className="flex size-9 items-center justify-center rounded-full transition hover:bg-secondary"
                      onClick={() => handleReaction(emoji)}
                    >
                      <span className="text-xl">{emoji}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button type="button" aria-label="Ambil foto" className={navBtn} onClick={handleCapture}>
            <Camera className="size-6" />
          </button>

          {/* Filter */}
          <div className="relative">
            <button
              type="button"
              aria-label="Efek"
              aria-expanded={filterMenuOpen}
              className={cn(navBtn, filterMenuOpen && 'text-primary', localFilter !== 'none' && 'text-primary')}
              onClick={() => setFilterMenuOpen((v) => !v)}
            >
              <Sparkles className="size-6" />
            </button>
            {filterMenuOpen && (
              <FilterMenu
                current={localFilter}
                onSelect={handleSelectFilter}
                onClose={() => setFilterMenuOpen(false)}
              />
            )}
          </div>
        </nav>
      </aside>

      {/* Main: video area + bottom action bar */}
      <main className="app-main flex flex-1 flex-col px-4 pb-4 pt-16 sm:px-8 sm:pt-[72px]">
        <div className="video-call-wrapper relative w-full flex-1 overflow-hidden rounded-2xl bg-zinc-950">
          {/* Remote (full-bleed) */}
          <div data-vc="remote" className="absolute inset-0">
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
              <span className="absolute bottom-3 right-3 rounded px-3 py-1 text-xs text-white vc-glass">
                Teman
              </span>
            )}
          </div>

          {/* Local PiP tile */}
          <div
            data-vc="local"
            className="absolute right-3 top-3 z-10 aspect-video w-28 overflow-hidden rounded-lg border border-white/20 bg-zinc-950 shadow-lg sm:w-44"
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
            <span className="absolute bottom-1 right-1 rounded px-2 py-0.5 text-[10px] text-white vc-glass">
              You
            </span>
          </div>

          {/* Floating reactions */}
          <ReactionsOverlay reactions={reactions} onDone={removeReaction} />

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
            <div className="pointer-events-auto">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Minimalkan"
                className="rounded-full bg-black/40 text-white hover:bg-black/60"
                onClick={() => setMinimized(true)}
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
                <Button
                  onClick={copyLink}
                  size="sm"
                  className="mt-3 w-full gap-2 rounded-lg"
                >
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

      {/* Right chat panel */}
      <AnimatePresence>
        {chatOpen && (
          <motion.aside
            key="right-side"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
            className="right-side absolute inset-y-0 right-0 z-30 flex w-full flex-col gap-3 bg-background p-3 sm:w-[360px] lg:relative lg:ml-auto lg:w-[400px] lg:shrink-0 lg:bg-transparent lg:p-4"
          >
            <button
              type="button"
              aria-label="Tutup pesan"
              className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground lg:hidden"
              onClick={() => setChatOpen(false)}
            >
              <X className="size-5" />
            </button>
            <div className="h-[calc(100%-72px)] min-h-0">
              <ChatPanel
                messages={chatMessages}
                onSend={handleSendChat}
                onClose={() => setChatOpen(false)}
                peerName="Teman"
              />
            </div>
            {/* Participants (1:1 = 2 avatars) */}
            <div className="participants ml-auto flex items-center gap-2 rounded-lg bg-card p-3 vc-shadow">
              <div className="flex size-8 items-center justify-center rounded-lg bg-secondary text-xs font-bold text-primary">Me</div>
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">T</div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Expand chat (mobile, when closed) */}
      {!chatOpen && (
        <button
          type="button"
          aria-label="Buka pesan"
          className="expand-btn absolute right-4 top-5 z-40 flex size-9 items-center justify-center rounded-lg bg-card vc-shadow lg:hidden"
          onClick={() => setChatOpen(true)}
        >
          <MessageCircle className="size-5 text-primary" />
        </button>
      )}
    </div>
  )
}
