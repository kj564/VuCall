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
    'flex w-full flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium text-white/85 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-not-allowed disabled:opacity-35'
  const icon = 'size-5'

  return (
    <div role="toolbar" aria-label="Kontrol panggilan" className="flex w-full flex-col items-center gap-1">
      <button type="button" onClick={onToggleMic} disabled={disabled} aria-label={micOn ? 'Matikan mikrofon' : 'Nyalakan mikrofon'} aria-pressed={!micOn} title={micOn ? 'Matikan mikrofon' : 'Nyalakan mikrofon'} className={cn(item, !micOn && 'bg-white/15 text-white')}>
        {micOn ? <Mic className={icon} /> : <MicOff className={icon} />}
        <span>Mikrofon</span>
      </button>
      <button type="button" onClick={onToggleCam} disabled={disabled} aria-label={camOn ? 'Matikan kamera' : 'Nyalakan kamera'} aria-pressed={!camOn} title={camOn ? 'Matikan kamera' : 'Nyalakan kamera'} className={cn(item, !camOn && 'bg-white/15 text-white')}>
        {camOn ? <Video className={icon} /> : <VideoOff className={icon} />}
        <span>Kamera</span>
      </button>
      {canSwitchCamera && (
        <button type="button" onClick={onSwitchCamera} disabled={disabled} aria-label="Ganti kamera depan/belakang" title="Ganti kamera" className={item}>
          <SwitchCamera className={icon} />
          <span>Balik</span>
        </button>
      )}
      <button type="button" onClick={onToggleMirror} disabled={disabled || sharing} aria-label={mirror ? 'Matikan mirror kamera' : 'Nyalakan mirror kamera'} aria-pressed={mirror} title="Mirror kamera depan" className={cn(item, mirror && 'bg-white/15 text-white')}>
        <FlipHorizontal className={icon} />
        <span>Mirror</span>
      </button>
      <button type="button" onClick={onToggleScreenShare} disabled={disabled} aria-label={sharing ? 'Hentikan berbagi layar' : 'Bagikan layar'} aria-pressed={sharing} title={sharing ? 'Hentikan berbagi layar' : 'Bagikan layar'} className={cn(item, sharing && 'bg-white/15 text-white')}>
        {sharing ? <ScreenShareOff className={icon} /> : <ScreenShare className={icon} />}
        <span>{sharing ? 'Stop share' : 'Share layar'}</span>
      </button>
      <button type="button" onClick={onToggleFullscreen} disabled={disabled} aria-label={fullscreen ? 'Keluar dari layar penuh' : 'Layar penuh'} aria-pressed={fullscreen} title={fullscreen ? 'Keluar dari layar penuh' : 'Layar penuh'} className={cn(item, fullscreen && 'bg-white/15 text-white')}>
        {fullscreen ? <Minimize2 className={icon} /> : <Maximize2 className={icon} />}
        <span>Layar penuh</span>
      </button>
      <div className="my-1 h-px w-8 bg-white/15" />
      <button type="button" onClick={onEnd} aria-label="Akhiri panggilan" title="Akhiri panggilan" className="flex w-full flex-col items-center justify-center gap-1 rounded-xl bg-red-600 px-1 py-2 text-[10px] font-semibold text-white hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300">
        <PhoneOff className={icon} />
        <span>Akhiri</span>
      </button>
    </div>
  )
}
