'use client'

import {
  Check,
  Copy,
  FlipHorizontal,
  Mic,
  MicOff,
  PhoneCall,
  Video,
  VideoOff,
  Volume2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'
import { VideoTile } from './video-tile'

export type PreJoinProps = {
  localStream: MediaStream | null
  micOn: boolean
  camOn: boolean
  mirror: boolean
  roomId: string
  onToggleMic: () => void
  onToggleCam: () => void
  onToggleMirror: () => void
  onTestSpeaker: () => void
  onJoin: () => void
  copied: boolean
  onCopyLink: () => void
}

/**
 * PreJoin — Instagram-style "ready to join" device-setup screen (dark).
 *
 * Mirrors the real Instagram VC pre-join scrape (ig1): app title, local
 * preview tile, prominent "Join call" CTA, microphone/camera toggle rows
 * (with a Switch), a "Test speaker" row, and the room-id + copy-link block.
 * Theme tokens come from `.dark` in globals.css (Instagram --web-wash etc.).
 */
export function PreJoin({
  localStream,
  micOn,
  camOn,
  mirror,
  roomId,
  onToggleMic,
  onToggleCam,
  onToggleMirror,
  onTestSpeaker,
  onJoin,
  copied,
  onCopyLink,
}: PreJoinProps) {
  return (
    <main className="flex h-[100dvh] w-full flex-col items-center justify-center gap-5 bg-background p-6 text-center">
      <h1 className="text-2xl font-bold text-foreground">VuCall</h1>

      {/* Local preview tile (mirrored per the setting; object-contain so the full
          frame shows with black bars — no over-zoom; placeholder while loading) */}
      <div className="aspect-video w-full max-w-md overflow-hidden rounded-2xl bg-black">
        <VideoTile
          stream={localStream}
          objectCover={false}
          muted
          mirror={mirror}
          aria-label="Your video"
          placeholder={
            <div className="flex h-full w-full items-center justify-center bg-black">
              <div
                aria-hidden="true"
                className="size-8 animate-spin rounded-full border-2 border-white/20 border-t-white"
              />
              <span className="sr-only">Memuat kamera…</span>
            </div>
          }
        />
      </div>

      {/* Join call — Instagram blue CTA */}
      <button
        type="button"
        onClick={onJoin}
        className="inline-flex w-full max-w-md items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <PhoneCall className="size-5" aria-hidden="true" />
        Join call
      </button>

      {/* Microphone toggle row */}
      <div className="flex w-full max-w-md items-center justify-between rounded-xl bg-secondary px-4 py-3">
        <span className="flex items-center gap-3 text-foreground">
          {micOn ? (
            <Mic className="size-5" aria-hidden="true" />
          ) : (
            <MicOff className="size-5" aria-hidden="true" />
          )}
          <span className="text-sm font-medium">Microphone</span>
        </span>
        <Switch
          checked={micOn}
          onCheckedChange={onToggleMic}
          aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}
        />
      </div>

      {/* Camera toggle row */}
      <div className="flex w-full max-w-md items-center justify-between rounded-xl bg-secondary px-4 py-3">
        <span className="flex items-center gap-3 text-foreground">
          {camOn ? (
            <Video className="size-5" aria-hidden="true" />
          ) : (
            <VideoOff className="size-5" aria-hidden="true" />
          )}
          <span className="text-sm font-medium">Camera</span>
        </span>
        <Switch
          checked={camOn}
          onCheckedChange={onToggleCam}
          aria-label={camOn ? 'Turn off camera' : 'Turn on camera'}
        />
      </div>

      {/* Test speaker row */}
      <button
        type="button"
        onClick={onTestSpeaker}
        className="flex w-full max-w-md items-center gap-3 rounded-xl bg-secondary px-4 py-3 text-left text-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Volume2 className="size-5" aria-hidden="true" />
        <span className="text-sm font-medium">Test speaker</span>
      </button>

      {/* Mirror front-camera toggle row (back camera is never mirrored) */}
      <div className="flex w-full max-w-md items-center justify-between rounded-xl bg-secondary px-4 py-3">
        <span className="flex items-center gap-3 text-foreground">
          <FlipHorizontal className="size-5" aria-hidden="true" />
          <span className="text-sm font-medium">Mirror kamera depan</span>
        </span>
        <Switch
          checked={mirror}
          onCheckedChange={onToggleMirror}
          aria-label={mirror ? 'Nonaktifkan mirror kamera depan' : 'Aktifkan mirror kamera depan'}
        />
      </div>

      {/* Room id + copy link */}
      <div className="mt-2 flex w-full max-w-md flex-col items-center gap-1.5">
        <p className="text-xs text-muted-foreground">
          Kode ruangan:{' '}
          <span className="font-mono text-foreground">{roomId}</span>
        </p>
        <button
          type="button"
          onClick={onCopyLink}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            copied
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {copied ? (
            <Check className="size-3.5" aria-hidden="true" />
          ) : (
            <Copy className="size-3.5" aria-hidden="true" />
          )}
          {copied ? 'Tautan disalin' : 'Salin tautan'}
        </button>
      </div>
    </main>
  )
}
