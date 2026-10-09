'use client'

import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { ReactionEvent } from '@/lib/signaling'

export type ReactionsOverlayProps = {
  /** Active reactions currently animating. */
  reactions: ReactionEvent[]
  /** Called when a reaction's float-up animation completes (so the parent
   *  can drop it from state). */
  onDone: (id: string) => void
}

export type ReactionPickerProps = {
  /** Called when the user taps an emoji button. */
  onSend: (emoji: string) => void
  /** Disable all buttons (e.g. before the peer has connected). */
  disabled?: boolean
}

/** Pre-computed, stable-per-id animation params for a floating reaction. */
type ReactionParams = {
  /** Horizontal start position as a percentage of the overlay width (10–90). */
  x: number
  /** Distance (px, negative = up) the emoji floats during its lifetime. */
  yEnd: number
  /** Net rotation (deg) applied over the animation. */
  rotate: number
}

const FLOAT_DURATION = 2.4
const PICKER_EMOJI = ['❤️', '👍', '😂', '🔥', '😮', '🎉'] as const
const PICKER_LABELS: Record<(typeof PICKER_EMOJI)[number], string> = {
  '❤️': 'Heart',
  '👍': 'Thumbs up',
  '😂': 'Laughing',
  '🔥': 'Fire',
  '😮': 'Surprised',
  '🎉': 'Party',
}

/** Compute one randomised bundle of float params (called ONCE per id). */
function makeParams(): ReactionParams {
  return {
    x: 10 + Math.random() * 80, // 10% → 90%
    yEnd: -1 * (200 + Math.random() * 120),
    rotate: (Math.random() - 0.5) * 30,
  }
}

/**
 * ReactionsOverlay — Instagram-style floating emoji reactions layer.
 *
 * Each reaction floats UP from a random x near the bottom of the remote
 * video, peaks, and fades out. When the animation completes, `onDone(id)`
 * fires so the parent can drop the reaction from state.
 *
 * Per-id animation params (x, yEnd, rotate) are computed ONCE the first
 * time an id is seen and then stay stable for that reaction's lifetime
 * (otherwise framer-motion would re-trigger the animation every render).
 * We use React's "adjust state when a prop changes" pattern (set state
 * during render, conditionally) rather than a ref — refs accessed during
 * render are flagged by `react-hooks/refs`.
 */
export function ReactionsOverlay({
  reactions,
  onDone,
}: ReactionsOverlayProps) {
  // Stable per-id params cache. Seeded lazily from the initial `reactions`
  // list, then re-synced when the `reactions` array reference changes.
  const [paramsMap, setParamsMap] = React.useState<
    Map<string, ReactionParams>
  >(() => {
    const m = new Map<string, ReactionParams>()
    for (const r of reactions) m.set(r.id, makeParams())
    return m
  })

  // Track the previous `reactions` reference so we can detect prop changes
  // during render and sync derived state (the canonical React pattern for
  // "adjust state when a prop changes" — see React docs).
  const [prevReactions, setPrevReactions] =
    React.useState<ReactionEvent[] | null>(reactions)

  if (reactions !== prevReactions) {
    setPrevReactions(reactions)
    setParamsMap((prev) => {
      let next: Map<string, ReactionParams> | null = null
      const ensure = (): Map<string, ReactionParams> => {
        if (!next) next = new Map(prev)
        return next
      }
      // Seed params for any new reaction ids.
      for (const r of reactions) {
        if (!prev.has(r.id)) ensure().set(r.id, makeParams())
      }
      // Prune ids that are no longer present.
      const live = new Set(reactions.map((r) => r.id))
      for (const id of prev.keys()) {
        if (!live.has(id)) ensure().delete(id)
      }
      return next ?? prev
    })
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
    >
      <AnimatePresence>
        {reactions.map((r) => {
          const p = paramsMap.get(r.id)
          // On the very first render of a brand-new reaction the params
          // aren't seeded yet (state sync above is deferred to next
          // render) — render nothing for one frame, then animate.
          if (!p) return null
          return (
            <motion.span
              key={r.id}
              initial={{ y: 0, opacity: 0, scale: 0.5 }}
              animate={{
                y: p.yEnd,
                opacity: [0, 1, 1, 0],
                scale: [0.5, 1.2, 1, 0.8],
                rotate: p.rotate,
              }}
              transition={{ duration: FLOAT_DURATION, ease: 'easeOut' }}
              onAnimationComplete={() => onDone(r.id)}
              style={{ left: `${p.x}%` }}
              className="absolute bottom-20 select-none text-4xl"
            >
              {r.emoji}
            </motion.span>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

/**
 * ReactionPicker — compact horizontal row of 6 emoji buttons shown above the
 * bottom control bar. Tapping a button fires `onSend(emoji)` so the parent
 * can render it locally and broadcast it to the peer over signaling.
 */
export function ReactionPicker({ onSend, disabled }: ReactionPickerProps) {
  return (
    <div
      role="toolbar"
      aria-label="Send reaction"
      className="pointer-events-auto flex items-center gap-2 rounded-full bg-black/40 px-3 py-2 backdrop-blur"
    >
      {PICKER_EMOJI.map((emoji) => (
        <button
          key={emoji}
          type="button"
          aria-label={PICKER_LABELS[emoji]}
          disabled={disabled}
          onClick={() => onSend(emoji)}
          className="flex size-9 items-center justify-center rounded-full text-xl transition hover:bg-white/15 active:scale-90 disabled:opacity-40"
        >
          <span aria-hidden="true">{emoji}</span>
        </button>
      ))}
    </div>
  )
}
