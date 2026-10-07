'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import type { Reaction } from '@/lib/webrtc'

type ReactionsOverlayProps = {
  reactions: Reaction[]
  onDone: (id: string) => void
}

/**
 * Stable hash → number in [0, 1). Used to derive deterministic per-reaction
 * randomization (x position, drift, scale, stagger) so the same reaction id
 * always renders identically across re-renders (no jitter on parent state
 * updates).
 */
function hash01(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0
  }
  return (Math.abs(h) % 1000) / 1000
}

type ReactionItemProps = {
  reaction: Reaction
  onDone: (id: string) => void
}

/**
 * A single rising emoji. Schedules its own removal via a one-shot setTimeout
 * (cleared on unmount) — never setState synchronously during render.
 */
function ReactionItem({ reaction, onDone }: ReactionItemProps) {
  const xPct = React.useMemo(() => 10 + hash01(reaction.id) * 80, [reaction.id]) // 10%..90%
  const drift = React.useMemo(
    () => (hash01(reaction.id + 'drift') - 0.5) * 80, // -40..+40 px
    [reaction.id],
  )
  const scale = React.useMemo(
    () => 0.85 + hash01(reaction.id + 'scale') * 0.4, // 0.85..1.25
    [reaction.id],
  )
  const delay = React.useMemo(
    () => hash01(reaction.id + 'delay') * 0.15, // 0..0.15s stagger
    [reaction.id],
  )

  // Schedule removal once the rise animation has finished (~2.4s) plus a
  // small grace window. The setTimeout is one-shot and cleared on unmount,
  // so it never triggers React's "set-state-in-effect" loop guard.
  React.useEffect(() => {
    const t = setTimeout(() => onDone(reaction.id), 2600 + delay * 1000)
    return () => clearTimeout(t)
  }, [reaction.id, delay, onDone])

  return (
    <motion.span
      key={reaction.id}
      className="pointer-events-none absolute bottom-0 text-5xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)]"
      style={{ left: `${xPct}%` }}
      initial={{ y: '20%', opacity: 0, scale: scale * 0.6, x: 0 }}
      animate={{
        y: '-60vh',
        opacity: [0, 1, 1, 0],
        x: drift,
        scale: [scale * 0.6, scale * 1.1, scale],
      }}
      transition={{
        duration: 2.4,
        delay,
        ease: 'easeOut',
        opacity: { times: [0, 0.12, 0.75, 1] },
      }}
    >
      {reaction.emoji}
    </motion.span>
  )
}

/**
 * ReactionsOverlay — Instagram-style floating emoji reactions that rise from
 * the bottom of the parent and fade out near the top. Pointer-events-none so
 * it never blocks call controls. The parent must be `relative` (the overlay
 * is absolute inset-0).
 */
export function ReactionsOverlay({ reactions, onDone }: ReactionsOverlayProps) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
    >
      {reactions.map((r) => (
        <ReactionItem key={r.id} reaction={r} onDone={onDone} />
      ))}
    </div>
  )
}
