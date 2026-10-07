'use client'

import * as React from 'react'

export type ReconnectingOverlayProps = {
  /** Render the overlay when true, return null when false. */
  visible: boolean
  /** Current reconnect attempt number (1-based). */
  attempt?: number
  /** Optional human-readable reason (e.g. "ICE failed" or "Network offline"). */
  reason?: string
}

/**
 * ReconnectingOverlay — shown when the connection is recovering.
 *
 * This is the key UX delta vs Instagram: instead of dropping the call on a
 * transient network blip, we hold the call open and tell the user we're
 * recovering. The overlay sits absolutely inside its parent (which should be
 * `relative`) and passes pointer events through so the user can still tap
 * end-call underneath if needed.
 */
export function ReconnectingOverlay({
  visible,
  attempt,
  reason,
}: ReconnectingOverlayProps) {
  if (!visible) return null

  const subtitle = attempt
    ? `Attempt ${attempt} — keeping the call alive`
    : 'Network unstable — recovering'

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
    >
      <div className="rounded-2xl bg-black/70 px-6 py-5 text-center backdrop-blur-md">
        <div
          aria-hidden="true"
          className="mx-auto mb-3 size-8 animate-spin rounded-full border-2 border-white/30 border-t-white"
        />
        <p className="text-white font-semibold">Reconnecting…</p>
        <p className="mt-1 text-sm text-white/80">{subtitle}</p>
        {reason && (
          <p className="mt-1 text-xs text-white/50">{reason}</p>
        )}
      </div>
    </div>
  )
}
