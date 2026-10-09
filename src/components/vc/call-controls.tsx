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
  FlipHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type CallControlsProps = {
  micOn: boolean
  camOn: boolean
  sharing: boolean
  fullscreen: boolean
  mirror: boolean
  onToggleMic: () => void
  onToggleCam: () => void
  onToggleScreenShare: () => void
  onToggleFullscreen: () => void
  onToggleMirror: () => void
  onSwitchCamera: () => void
  onEnd: () => void
  canSwitchCamera?: boolean
  disabled?: boolean
}

/** Compact, low-distraction controls for the in-call side panel. */
export function CallControls({
  micOn,
  camOn,
  sharing,
  fullscreen,
  mirror,
  onToggleMic,
  onToggleCam,
  onToggleScreenShare,
  onToggleFullscreen,
  onToggleMirror,
  onSwitchCamera,
  onEnd,
  canSwitchCamera = false,
  disabled = false,
}: CallControlsProps) {
  const item =
    'flex size-9 shrink-0 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-not-allowed disabled:opacity-35'
  const icon = 'size-5'

  return (
    <div role="toolbar" aria-label="Kontrol panggilan" className="flex flex-col items-center gap-2">
      <button type="button" onClick={onToggleMic} disabled={disabled} aria-label={micOn ? 'Matikan mikrofon' : 'Nyalakan mikrofon'} aria-pressed={!micOn} title={micOn ? 'Matikan mikrofon' : 'Nyalakan mikrofon'} className={cn(item, !micOn && 'bg-white/15 text-white')}>
        {micOn ? <Mic className={icon} /> : <MicOff className={icon} />}
      </button>
      <button type="button" onClick={onToggleCam} disabled={disabled} aria-label={camOn ? 'Matikan kamera' : 'Nyalakan kamera'} aria-pressed={!camOn} title={camOn ? 'Matikan kamera' : 'Nyalakan kamera'} className={cn(item, !camOn && 'bg-white/15 text-white')}>
        {camOn ? <Video className={icon} /> : <VideoOff className={icon} />}
      </button>
      {canSwitchCamera && (
        <button type="button" onClick={onSwitchCamera} disabled={disabled} aria-label="Ganti kamera depan/belakang" title="Ganti kamera" className={item}>
          <SwitchCamera className={icon} />
        </button>
      )}
      <button type="button" onClick={onToggleMirror} disabled={disabled || sharing} aria-label={mirror ? 'Matikan mirror kamera' : 'Nyalakan mirror kamera'} aria-pressed={mirror} title="Mirror kamera depan" className={cn(item, mirror && 'bg-white/15 text-white')}>
        <FlipHorizontal className={icon} />
      </button>
      <button type="button" onClick={onToggleScreenShare} disabled={disabled} aria-label={sharing ? 'Hentikan berbagi layar' : 'Bagikan layar'} aria-pressed={sharing} title={sharing ? 'Hentikan berbagi layar' : 'Bagikan layar'} className={cn(item, sharing && 'bg-white/15 text-white')}>
        {sharing ? <ScreenShareOff className={icon} /> : <ScreenShare className={icon} />}
      </button>
      <button type="button" onClick={onToggleFullscreen} disabled={disabled} aria-label={fullscreen ? 'Keluar dari layar penuh' : 'Layar penuh'} aria-pressed={fullscreen} title={fullscreen ? 'Keluar dari layar penuh' : 'Layar penuh'} className={cn(item, fullscreen && 'bg-white/15 text-white')}>
        {fullscreen ? <Minimize2 className={icon} /> : <Maximize2 className={icon} />}
      </button>
      <div className="my-1 h-px w-6 bg-white/20" />
      <button type="button" onClick={onEnd} aria-label="Akhiri panggilan" title="Akhiri panggilan" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-600 text-white transition hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300">
        <PhoneOff className={icon} />
      </button>
    </div>
  )
}
