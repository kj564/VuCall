'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export type VideoTileProps = {
  /** MediaStream to bind to the <video> element. null => placeholder shown. */
  stream: MediaStream | null
  /** Horizontally flip the video (use for the local camera preview). */
  mirror?: boolean
  /** Mute the element's audio output. Defaults to true (local tiles are muted). */
  muted?: boolean
  /** true => object-cover full-bleed; false => object-contain (letterboxed). */
  objectCover?: boolean
  /** Extra classes for the wrapper. */
  className?: string
  /** Rendered when stream is null. */
  placeholder?: React.ReactNode
  /** Accessibility label for the video element. */
  'aria-label'?: string
}

/**
 * VideoTile — a reusable <video> element that binds a MediaStream.
 *
 * Instagram-style: the remote tile is full-bleed object-cover; the local tile
 * is a small PiP in the corner. Both share this component.
 */
export function VideoTile({
  stream,
  mirror = false,
  muted = true,
  objectCover = true,
  className,
  placeholder,
  'aria-label': ariaLabel,
}: VideoTileProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null)

  React.useEffect(() => {
    const el = videoRef.current
    if (!el) return

    el.srcObject = stream
    let disposed = false

    // A remote stream can be assigned before its first video frame arrives.
    // Retry playback as metadata/data becomes available instead of making one
    // early play() call and leaving the tile black if that call rejects.
    const tryPlay = () => {
      if (disposed || !stream || stream.getVideoTracks().every((track) => track.readyState === 'ended')) return
      void el.play().catch(() => {
        // Autoplay restrictions vary by browser. Keep the element attached and
        // retry on the next media-ready event or direct user interaction.
      })
    }
    const retryOnInteraction = () => tryPlay()
    el.addEventListener('loadedmetadata', tryPlay)
    el.addEventListener('loadeddata', tryPlay)
    el.addEventListener('canplay', tryPlay)
    document.addEventListener('pointerdown', retryOnInteraction, { passive: true })
    document.addEventListener('keydown', retryOnInteraction)

    const tracks = stream?.getTracks() ?? []
    for (const track of tracks) track.addEventListener('unmute', tryPlay)
    tryPlay()

    return () => {
      disposed = true
      el.removeEventListener('loadedmetadata', tryPlay)
      el.removeEventListener('loadeddata', tryPlay)
      el.removeEventListener('canplay', tryPlay)
      document.removeEventListener('pointerdown', retryOnInteraction)
      document.removeEventListener('keydown', retryOnInteraction)
      for (const track of tracks) track.removeEventListener('unmute', tryPlay)
      if (el.srcObject === stream) el.srcObject = null
    }
  }, [stream])

  // Keep the muted attribute in sync with the prop (also helps autoplay policy).
  React.useEffect(() => {
    const el = videoRef.current
    if (!el) return
    el.muted = muted
  }, [muted])

  if (!stream && placeholder) {
    return (
      <div className={cn('relative h-full w-full overflow-hidden', className)}>
        {placeholder}
      </div>
    )
  }

  return (
    <video
      ref={videoRef}
      playsInline
      autoPlay
      muted={muted}
      aria-label={ariaLabel}
      className={cn(
        'h-full w-full bg-black',
        objectCover ? 'object-cover' : 'object-contain',
        mirror && 'scale-x-[-1]',
        className
      )}
    />
  )
}
