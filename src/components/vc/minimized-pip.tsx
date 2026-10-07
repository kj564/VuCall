'use client'

import * as React from 'react'
import { Maximize2, PhoneOff } from 'lucide-react'
import { VideoTile } from '@/components/vc/video-tile'
import { QualityBars } from '@/components/vc/quality-bars'
import type { NetworkQuality } from '@/lib/webrtc'
import { cn } from '@/lib/utils'

type MinimizedPipProps = {
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  quality: NetworkQuality
  onExpand: () => void
  onEnd: () => void
}

const EDGE_GAP = 16 // px gap from viewport edges

/**
 * MinimizedPip — a draggable floating mini-call card (Instagram's
 * minimize-to-PiP). Fixed-positioned, translated via state. Dragging uses
 * pointer events with pointer-capture for smooth behavior; movement is
 * clamped to the viewport. The whole card is the drag handle except the
 * control row, which calls `stopPropagation` on its pointerdown so the
 * expand / end buttons don't start a drag.
 *
 * Initial position: bottom-right corner (computed on mount after measuring
 * the card, so width/height handle both `w-44` and `sm:w-52`).
 */
export function MinimizedPip({
  localStream,
  remoteStream,
  quality,
  onExpand,
  onEnd,
}: MinimizedPipProps) {
  const cardRef = React.useRef<HTMLDivElement>(null)
  const [pos, setPos] = React.useState<{ x: number; y: number }>({
    x: -9999,
    y: -9999,
  })
  const [ready, setReady] = React.useState(false)
  const [dragging, setDragging] = React.useState(false)
  const startRef = React.useRef<{
    px: number
    py: number
    ox: number
    oy: number
    w: number
    h: number
  } | null>(null)

  // Measure the card on mount; place at the bottom-right corner.
  React.useLayoutEffect(() => {
    const el = cardRef.current
    if (!el || typeof window === 'undefined') return
    const w = el.offsetWidth
    const h = el.offsetHeight
    setPos({
      x: Math.max(0, window.innerWidth - w - EDGE_GAP),
      y: Math.max(0, window.innerHeight - h - EDGE_GAP),
    })
    setReady(true)
  }, [])

  // Re-clamp to viewport when the window resizes.
  React.useEffect(() => {
    const onResize = () => {
      const el = cardRef.current
      if (!el) return
      const w = el.offsetWidth
      const h = el.offsetHeight
      setPos((p) => ({
        x: Math.max(0, Math.min(p.x, window.innerWidth - w - EDGE_GAP)),
        y: Math.max(0, Math.min(p.y, window.innerHeight - h - EDGE_GAP)),
      }))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const onPointerDown = (e: React.PointerEvent) => {
    // Only left-click (or touch / pen primary).
    if (e.button !== 0) return
    const el = cardRef.current
    if (!el) return
    startRef.current = {
      px: e.clientX,
      py: e.clientY,
      ox: pos.x,
      oy: pos.y,
      w: el.offsetWidth,
      h: el.offsetHeight,
    }
    setDragging(true)
    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch {
      /* pointer capture not supported — drag still works via move/up */
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || !startRef.current) return
    const dx = e.clientX - startRef.current.px
    const dy = e.clientY - startRef.current.py
    const maxX = Math.max(0, window.innerWidth - startRef.current.w - EDGE_GAP)
    const maxY = Math.max(0, window.innerHeight - startRef.current.h - EDGE_GAP)
    const nx = Math.max(EDGE_GAP, Math.min(startRef.current.ox + dx, maxX))
    const ny = Math.max(EDGE_GAP, Math.min(startRef.current.oy + dy, maxY))
    setPos({ x: nx, y: ny })
  }

  const endDrag = (e: React.PointerEvent) => {
    if (!dragging) return
    setDragging(false)
    startRef.current = null
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  // Show remote; fall back to local if there's no remote stream yet.
  const stream = remoteStream ?? localStream

  return (
    <div
      ref={cardRef}
      role="dialog"
      aria-label="Minimized call — drag to move"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        opacity: ready ? 1 : 0,
        zIndex: 50,
        touchAction: 'none',
      }}
      className={cn(
        'w-44 select-none overflow-hidden rounded-2xl border border-white/15 bg-black shadow-2xl shadow-black/50 sm:w-52',
        dragging ? 'cursor-grabbing' : 'cursor-grab',
      )}
    >
      {/* Remote (or local fallback) video */}
      <div className="relative aspect-video w-full bg-black">
        <VideoTile
          stream={stream}
          muted={false}
          objectCover
          className="h-full w-full"
          aria-label="Remote video preview"
          placeholder={
            <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-xs text-white/50">
              No video
            </div>
          }
        />

        {/* "VuCall" label with pulsing dot */}
        <div className="pointer-events-none absolute left-2 top-2 z-10 flex items-center gap-1.5 rounded-full bg-black/60 px-2 py-1 backdrop-blur">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
          </span>
          <span className="text-[10px] font-semibold text-white">VuCall</span>
        </div>

        {/* Local PiP overlay (bottom-right) */}
        {localStream && (
          <div className="absolute bottom-2 right-2 z-10 h-20 w-14 overflow-hidden rounded-md border border-white/20 bg-black shadow-lg">
            <VideoTile
              stream={localStream}
              mirror
              muted
              objectCover
              className="h-full w-full"
              aria-label="Your video preview"
            />
          </div>
        )}
      </div>

      {/* Slim control row — stops pointerdown propagation so the buttons
          don't start a drag. */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        className="flex items-center gap-2 border-t border-white/10 bg-black/80 px-2 py-1.5 backdrop-blur"
      >
        <QualityBars quality={quality} />
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={onExpand}
            aria-label="Expand call"
            className="flex size-7 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            <Maximize2 className="size-4" />
          </button>
          <button
            type="button"
            onClick={onEnd}
            aria-label="End call"
            className="flex size-7 items-center justify-center rounded-full bg-red-600 text-white transition-colors hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/70"
          >
            <PhoneOff className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
