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
    <main className="flex min-h-[100dvh] w-full flex-col bg-[#101114] px-4 py-5 text-white sm:px-6 sm:py-7">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between">
        <a href="/" className="flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400" aria-label="VuCall beranda">
          <span className="flex size-8 items-center justify-center rounded-lg bg-blue-600">
            <Video className="size-4" aria-hidden="true" />
          </span>
          <span className="text-lg font-semibold tracking-tight">VuCall</span>
        </a>
        <span className="text-xs text-white/45">Persiapan panggilan</span>
      </header>

      <section className="mx-auto my-auto grid w-full max-w-5xl gap-5 py-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(260px,0.8fr)]">
        <div className="min-w-0">
          <div className="mb-4">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Sebelum terhubung</h1>
            <p className="mt-1.5 text-sm text-white/55">Periksa kamera dan mikrofonmu terlebih dahulu.</p>
          </div>

          <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-[#08090b]">
            <VideoTile
              stream={localStream}
              objectCover
              muted
              mirror={mirror}
              aria-label="Pratinjau video kamu"
              className="h-full w-full"
              placeholder={
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[#08090b] text-center">
                  <Video className="size-7 text-white/35" aria-hidden="true" />
                  <p className="text-sm text-white/70">Menyiapkan kamera…</p>
                  <p className="text-xs text-white/40">Izinkan akses kamera jika diminta browser.</p>
                </div>
              }
            />
            <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-md bg-black/55 px-2.5 py-1.5 text-xs text-white/85">
              <span className={cn('size-1.5 rounded-full', camOn ? 'bg-emerald-400' : 'bg-white/35')} />
              {camOn ? 'Kamera aktif' : 'Kamera mati'}
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.025] px-3.5 py-3">
              <span className="flex items-center gap-2.5">
                {micOn ? <Mic className="size-4 text-white/65" aria-hidden="true" /> : <MicOff className="size-4 text-white/45" aria-hidden="true" />}
                <span className="text-sm">Mikrofon</span>
              </span>
              <Switch checked={micOn} onCheckedChange={onToggleMic} aria-label={micOn ? 'Matikan mikrofon' : 'Nyalakan mikrofon'} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.025] px-3.5 py-3">
              <span className="flex items-center gap-2.5">
                {camOn ? <Video className="size-4 text-white/65" aria-hidden="true" /> : <VideoOff className="size-4 text-white/45" aria-hidden="true" />}
                <span className="text-sm">Kamera</span>
              </span>
              <Switch checked={camOn} onCheckedChange={onToggleCam} aria-label={camOn ? 'Matikan kamera' : 'Nyalakan kamera'} />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
            <button type="button" onClick={onTestSpeaker} className="inline-flex items-center gap-2 py-1 text-xs text-white/55 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
              <Volume2 className="size-3.5" aria-hidden="true" /> Uji speaker
            </button>
            <button type="button" onClick={onToggleMirror} disabled={!camOn} aria-pressed={mirror} className="inline-flex items-center gap-2 py-1 text-xs text-white/55 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-30">
              <FlipHorizontal className="size-3.5" aria-hidden="true" /> {mirror ? 'Mirror aktif' : 'Aktifkan mirror'}
            </button>
          </div>
        </div>

        <aside className="flex min-w-0 flex-col rounded-xl border border-white/10 bg-white/[0.025] p-5 sm:p-6">
          <div>
            <p className="text-xs text-white/45">KODE RUANG</p>
            <p className="mt-2 break-all font-mono text-lg font-medium tracking-wide">{roomId}</p>
            <button type="button" onClick={onCopyLink} className="mt-3 inline-flex items-center gap-2 text-xs text-white/55 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
              {copied ? <Check className="size-3.5 text-emerald-400" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
              {copied ? 'Tautan disalin' : 'Salin tautan undangan'}
            </button>
          </div>

          <div className="my-5 border-t border-white/10" />

          <p className="text-sm leading-6 text-white/55">Bagikan tautan ini agar orang yang kamu hubungi bisa masuk ke ruang yang sama.</p>

          <div className="mt-auto pt-8">
            <button type="button" onClick={onJoin} className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#101114]">
              <PhoneCall className="size-4" aria-hidden="true" />
              Bergabung ke panggilan
            </button>
            <p className="mt-3 text-center text-xs text-white/35">Kamu bisa mengubah pengaturan selama panggilan.</p>
          </div>
        </aside>
      </section>
    </main>
  )
}
