'use client'

import {
  Mic,
  MicOff,
  PhoneOff,
  SwitchCamera,
  Video,
  VideoOff,
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
  /** Render the switch-camera button when not false. Defaults to true. */
  canSwitchCamera?: boolean
  /** Disable all buttons (e.g. while not connected). */
  disabled?: boolean
}

/**
 * CallControls — restyled to the videocall-app-ui bottom action bar.
 *
 * A row of white square (`bg-card`) buttons with the signature `.vc-shadow`.
 * Media toggles flip their icon and turn `text-destructive` when the
 * corresponding device is OFF, so the user always knows their media state.
 * The end-call control is a wider "Leave" pill with a red phone icon — the
 * only clearly destructive action.
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
    'size-12 rounded-lg bg-card vc-shadow flex items-center justify-center text-foreground transition hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40'

  return (
    <div
      role="toolbar"
      aria-label="Call controls"
      className="flex w-full max-w-[500px] items-center justify-between gap-2"
    >
      {/* Microphone toggle */}
      <button
        type="button"
        onClick={onToggleMic}
        disabled={disabled}
        aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}
        aria-pressed={!micOn}
        className={cn(baseBtn, !micOn && 'text-destructive')}
      >
        {micOn ? <Mic className="size-5" /> : <MicOff className="size-5" />}
      </button>

      {/* Camera toggle */}
      <button
        type="button"
        onClick={onToggleCam}
        disabled={disabled}
        aria-label={camOn ? 'Turn off camera' : 'Turn on camera'}
        aria-pressed={!camOn}
        className={cn(baseBtn, !camOn && 'text-destructive')}
      >
        {camOn ? <Video className="size-5" /> : <VideoOff className="size-5" />}
      </button>

      {/* Switch camera (hidden when not supported) */}
      {canSwitchCamera !== false && (
        <button
          type="button"
          onClick={onSwitchCamera}
          disabled={disabled}
          aria-label="Switch camera"
          className={baseBtn}
        >
          <SwitchCamera className="size-5" />
        </button>
      )}

      {/* End call — wider "Leave" pill, red icon + text */}
      <button
        type="button"
        onClick={onEnd}
        disabled={disabled}
        aria-label="Leave call"
        className={cn(
          'relative flex h-12 items-center gap-2 rounded-lg bg-card px-3 pl-10 text-destructive vc-shadow transition hover:opacity-70',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50',
          'disabled:pointer-events-none disabled:opacity-40',
        )}
      >
        <PhoneOff
          className="absolute left-3 top-1/2 size-5 -translate-y-1/2"
          aria-hidden="true"
        />
        <span className="text-sm font-medium">Leave</span>
      </button>
    </div>
  )
}
