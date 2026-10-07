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
    // play() can reject if the element isn't ready or autoplay is blocked;
    // we don't care — the user gesture that started the call already unlocked
    // autoplay for media with sound.
    el.play().catch(() => {})
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
