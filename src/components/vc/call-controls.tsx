'use client'

import {
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  PhoneOff,
  ScreenShare,
  ScreenShareOff,
  SwitchCamera,
  Video,
  VideoOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type CallControlsProps = {
  micOn: boolean
  camOn: boolean
  sharing: boolean
  fullscreen: boolean
  onToggleMic: () => void
  onToggleCam: () => void
  onToggleScreenShare: () => void
  onToggleFullscreen: () => void
  onSwitchCamera: () => void
  onEnd: () => void
  /** Render the switch-camera button when not false. Defaults to true. */
  canSwitchCamera?: boolean
  /** Disable all buttons (e.g. while not connected). */
  disabled?: boolean
}

/**
 * CallControls — bottom action bar matching the real Instagram VC controls
 * (per a scrape of instagram.com's in-call screen): "Mute microphone",
 * "Turn off video", "Share your screen", "Enter full screen", "End call".
 * Media toggles flip their icon and turn `text-destructive` when OFF.
 * Switch-camera is mobile-only (Instagram desktop doesn't surface it).
 */
export function CallControls({
  micOn,
  camOn,
  sharing,
  fullscreen,
  onToggleMic,
  onToggleCam,
  onToggleScreenShare,
  onToggleFullscreen,
  onSwitchCamera,
  onEnd,
  canSwitchCamera = true,
  disabled = false,
}: CallControlsProps) {
  const baseBtn =
    'size-12 rounded-full bg-card vc-shadow flex items-center justify-center text-foreground transition hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40'

  return (
    <div
      role="toolbar"
      aria-label="Call controls"
      className="flex w-full max-w-[520px] items-center justify-between gap-2"
    >
      {/* Mute microphone */}
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

      {/* Turn off video */}
      <button
        type="button"
        onClick={onToggleCam}
        disabled={disabled}
        aria-label={camOn ? 'Turn off video' : 'Turn on video'}
        aria-pressed={!camOn}
        className={cn(baseBtn, !camOn && 'text-destructive')}
      >
        {camOn ? <Video className="size-5" /> : <VideoOff className="size-5" />}
      </button>

      {/* Share your screen */}
      <button
        type="button"
        onClick={onToggleScreenShare}
        disabled={disabled}
        aria-label={sharing ? 'Stop sharing' : 'Share your screen'}
        aria-pressed={sharing}
        className={cn(baseBtn, sharing && 'bg-primary text-primary-foreground')}
      >
        {sharing ? (
          <ScreenShareOff className="size-5" />
        ) : (
          <ScreenShare className="size-5" />
        )}
      </button>

      {/* Enter / exit full screen */}
      <button
        type="button"
        onClick={onToggleFullscreen}
        disabled={disabled}
        aria-label={fullscreen ? 'Exit full screen' : 'Enter full screen'}
        aria-pressed={fullscreen}
        className={cn(baseBtn, fullscreen && 'text-primary')}
      >
        {fullscreen ? (
          <Minimize2 className="size-5" />
        ) : (
          <Maximize2 className="size-5" />
        )}
      </button>

      {/* Switch camera (mobile only — Instagram desktop doesn't show it) */}
      {canSwitchCamera !== false && (
        <button
          type="button"
          onClick={onSwitchCamera}
          disabled={disabled}
          aria-label="Switch camera"
          className={cn(baseBtn, 'sm:hidden')}
        >
          <SwitchCamera className="size-5" />
        </button>
      )}

      {/* End call — red round button (Instagram-style) */}
      <button
        type="button"
        onClick={onEnd}
        disabled={disabled}
        aria-label="End call"
        className={cn(
          'size-12 rounded-full bg-destructive text-white vc-shadow flex items-center justify-center transition hover:opacity-90',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50',
          'disabled:pointer-events-none disabled:opacity-40',
        )}
      >
        <PhoneOff className="size-5" />
      </button>
    </div>
  )
}
