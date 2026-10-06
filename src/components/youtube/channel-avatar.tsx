'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

// Channel avatar that shows the channel's image, falling back to a
// deterministic colored initials circle if the image fails to load.
const PALETTE = [
  'bg-rose-600',
  'bg-orange-600',
  'bg-amber-600',
  'bg-emerald-600',
  'bg-teal-600',
  'bg-cyan-600',
  'bg-violet-600',
  'bg-fuchsia-600',
  'bg-red-600',
  'bg-lime-600',
]

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function colorFor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  }
  return PALETTE[hash % PALETTE.length]
}

export function ChannelAvatar({
  name,
  src,
  className,
  size = 36,
}: {
  name: string
  src?: string
  className?: string
  size?: number
}) {
  const [errored, setErrored] = React.useState(false)
  const showFallback = !src || errored

  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-full bg-muted',
        className,
      )}
      style={{ width: size, height: size }}
    >
      {showFallback ? (
        <div
          className={cn(
            'flex h-full w-full items-center justify-center font-semibold text-white',
            colorFor(name),
          )}
          style={{ fontSize: size * 0.4 }}
        >
          {initials(name)}
        </div>
      ) : (
         
        <img
          src={src}
          alt={name}
          className="h-full w-full object-cover"
          onError={() => setErrored(true)}
        />
      )}
    </div>
  )
}
