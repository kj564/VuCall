'use client'

import * as React from 'react'
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  SwitchCamera,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type CallControlsProps = {
  /** Whether the microphone is currently enabled. */
  micOn: boolean
  /** Whether the camera is currently enabled. */
  camOn: boolean
  onToggleMic: () => void
  onToggleCam: () => void
  onSwitchCamera: () => void
  onEnd: () => void
  /** Hide the switch-camera button when false. Defaults to true. */
  canSwitchCamera?: boolean
  /** Disable all buttons (e.g. while not connected). */
  disabled?: boolean
}

/**
 * CallControls — Instagram-style floating bottom control pill.
 *
 * Layout: a row of round icon buttons inside a translucent black pill.
 * Each toggle is `bg-white/10 text-white` when ON and `bg-white text-black`
 * when OFF (muted / cam-off). The end-call button is a larger red circle.
 */
export function CallControls({
  micOn,
  camOn,
  onToggleMic,
  onToggleCam,
  onSwitchCamera,
  onEnd,
  canSwitchCamera = true,
  disabled = false,
}: CallControlsProps) {
  const baseBtn =
    'size-12 rounded-full flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-50 disabled:pointer-events-none'

  // On-state (active mic / active cam): subtle translucent white.
  // Off-state (muted / cam-off): solid white with black icon — high contrast
  // so the user always knows their media is off.
  const micBtn = micOn
    ? 'bg-white/10 text-white hover:bg-white/20'
    : 'bg-white text-black hover:bg-white/90'
  const camBtn = camOn
    ? 'bg-white/10 text-white hover:bg-white/20'
    : 'bg-white text-black hover:bg-white/90'

  return (
    <div
      role="toolbar"
      aria-label="Call controls"
      className="flex items-center gap-3 rounded-full bg-black/60 p-2 backdrop-blur-md"
    >
      <button
        type="button"
        onClick={onToggleMic}
        disabled={disabled}
        aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}
        aria-pressed={!micOn}
        className={cn(baseBtn, micBtn)}
      >
        {micOn ? <Mic className="size-5" /> : <MicOff className="size-5" />}
      </button>

      <button
        type="button"
        onClick={onToggleCam}
        disabled={disabled}
        aria-label={camOn ? 'Turn off camera' : 'Turn on camera'}
        aria-pressed={!camOn}
        className={cn(baseBtn, camBtn)}
      >
        {camOn ? <Video className="size-5" /> : <VideoOff className="size-5" />}
      </button>

      {canSwitchCamera && (
        <button
          type="button"
          onClick={onSwitchCamera}
          disabled={disabled}
          aria-label="Switch camera"
          className={cn(baseBtn, 'bg-white/10 text-white hover:bg-white/20')}
        >
          <SwitchCamera className="size-5" />
        </button>
      )}

      <button
        type="button"
        onClick={onEnd}
        disabled={disabled}
        aria-label="End call"
        className={cn(
          'size-14 rounded-full flex items-center justify-center transition-colors',
          'bg-red-600 text-white hover:bg-red-500',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/70',
          'disabled:opacity-50 disabled:pointer-events-none'
        )}
      >
        <PhoneOff className="size-6" />
      </button>
    </div>
  )
}
