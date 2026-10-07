'use client'

import * as React from 'react'

export type CallTimerProps = {
  /** Epoch ms (Date.now()) when the call connected. null => not started. */
  startedAt: number | null
  /** Only tick when true (e.g. status === 'connected'). */
  running: boolean
}

function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * CallTimer — small elapsed-time display.
 *
 * Displays "0:00" until the call is connected (running + startedAt). Once
 * connected, ticks every second and formats as M:SS (or H:MM:SS past 1h).
 */
export function CallTimer({ startedAt, running }: CallTimerProps) {
  const [now, setNow] = React.useState<number>(() => Date.now())

  React.useEffect(() => {
    // Always reset the displayed clock when we start/stop so we don't briefly
    // show a stale value from a previous call.
    setNow(Date.now())
    if (!running || startedAt == null) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [running, startedAt])

  const elapsed = running && startedAt != null ? now - startedAt : 0
  return <span aria-label="Call duration">{formatElapsed(elapsed)}</span>
}
