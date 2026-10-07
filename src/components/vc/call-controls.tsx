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
 * CallControls — Instagram-VC in-call control bar (dark-glassy circular).
 *
 * Matches the real Instagram VC scrape (ig2) aria-labels exactly:
 * "Mute microphone", "Turn off video", "Share your screen",
 * "Enter full screen", "End call". Media toggles flip their icon and turn
 * red (bg-destructive) when OFF; screen-share & fullscreen turn Instagram
 * blue (bg-primary) when ON. Switch-camera is mobile-only (sm:hidden),
 * since Instagram desktop doesn't surface it. The dark-glass overlay
 * (`bg-black/40 backdrop-blur`) mirrors Instagram's control overlay on video.
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
    'size-12 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white transition hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40'

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
        className={cn(
          baseBtn,
          !micOn &&
            'bg-destructive text-white hover:bg-destructive hover:opacity-90',
        )}
      >
        {micOn ? <Mic className="size-6" /> : <MicOff className="size-6" />}
      </button>

      {/* Turn off video */}
      <button
        type="button"
        onClick={onToggleCam}
        disabled={disabled}
        aria-label={camOn ? 'Turn off video' : 'Turn on video'}
        aria-pressed={!camOn}
        className={cn(
          baseBtn,
          !camOn &&
            'bg-destructive text-white hover:bg-destructive hover:opacity-90',
        )}
      >
        {camOn ? <Video className="size-6" /> : <VideoOff className="size-6" />}
      </button>

      {/* Share your screen */}
      <button
        type="button"
        onClick={onToggleScreenShare}
        disabled={disabled}
        aria-label={sharing ? 'Stop sharing' : 'Share your screen'}
        aria-pressed={sharing}
        className={cn(
          baseBtn,
          sharing &&
            'bg-primary text-primary-foreground hover:bg-primary hover:opacity-90',
        )}
      >
        {sharing ? (
          <ScreenShareOff className="size-6" />
        ) : (
          <ScreenShare className="size-6" />
        )}
      </button>

      {/* Enter / exit full screen */}
      <button
        type="button"
        onClick={onToggleFullscreen}
        disabled={disabled}
        aria-label={fullscreen ? 'Exit full screen' : 'Enter full screen'}
        aria-pressed={fullscreen}
        className={cn(
          baseBtn,
          fullscreen &&
            'bg-primary text-primary-foreground hover:bg-primary hover:opacity-90',
        )}
      >
        {fullscreen ? (
          <Minimize2 className="size-6" />
        ) : (
          <Maximize2 className="size-6" />
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
          <SwitchCamera className="size-6" />
        </button>
      )}

      {/* End call — red round button (Instagram-style) */}
      <button
        type="button"
        onClick={onEnd}
        disabled={disabled}
        aria-label="End call"
        className={cn(
          'size-12 rounded-full bg-destructive text-white flex items-center justify-center transition hover:opacity-90',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50',
          'disabled:opacity-40',
        )}
      >
        <PhoneOff className="size-6" />
      </button>
    </div>
  )
}
