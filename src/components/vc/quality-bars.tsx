'use client'

import * as React from 'react'
import type { NetworkQuality } from '@/lib/webrtc'
import { cn } from '@/lib/utils'

type QualityBarsProps = {
  /** 0 = no signal, 4 = excellent. */
  quality: NetworkQuality
}

/**
 * QualityBars — a compact phone-signal-style indicator for the WebRTC
 * connection quality. 4 vertical bars of increasing height; the number of
 * filled bars equals the quality score. Color shifts red → amber → green.
 *
 * Purely presentational — no interactivity.
 */
export function QualityBars({ quality }: QualityBarsProps) {
  const heights = ['h-[3px]', 'h-[5px]', 'h-[7px]', 'h-[9px]']

  // Color mapping per the spec:
  //  0 → red (all dim red), 1 → red (1 filled), 2 → amber (2 filled),
  //  3 → green (3 filled), 4 → green (all filled).
  let filledColor: string
  let dimColor: string
  if (quality === 0) {
    filledColor = 'bg-red-500'
    dimColor = 'bg-red-500/30'
  } else if (quality === 1) {
    filledColor = 'bg-red-500'
    dimColor = 'bg-white/20'
  } else if (quality === 2) {
    filledColor = 'bg-amber-400'
    dimColor = 'bg-white/20'
  } else {
    filledColor = 'bg-emerald-400'
    dimColor = 'bg-white/20'
  }

  const filledCount = quality

  return (
    <span
      role="status"
      aria-label={`Connection quality: ${quality} of 4`}
      title={`Connection: ${quality}/4`}
      className="inline-flex items-end gap-0.5"
    >
      {heights.map((h, i) => {
        const filled = i < filledCount
        return (
          <span
            key={i}
            aria-hidden
            className={cn('w-1 rounded-sm', h, filled ? filledColor : dimColor)}
          />
        )
      })}
    </span>
  )
}
