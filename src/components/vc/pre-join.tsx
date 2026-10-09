'use client'

import {
  Check,
  Copy,
  FlipHorizontal,
  Mic,
  MicOff,
  PhoneCall,
  ShieldCheck,
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
    <main className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-[#0b1020] px-4 py-8 text-white sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute -left-32 -top-32 size-96 rounded-full bg-blue-600/15 blur-[100px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -right-24 size-96 rounded-full bg-violet-600/15 blur-[110px]" />

      <div className="relative z-10 grid w-full max-w-5xl gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="flex min-w-0 flex-col rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-4 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-6">
          <header className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">Persiapan panggilan</p>
              <h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl">Periksa sebelum bergabung</h1>
              <p className="mt-2 text-sm leading-6 text-slate-400">Pastikan kamera dan mikrofon siap sebelum masuk ruang.</p>
            </div>
            <div className="hidden size-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-blue-300 sm:flex">
              <Video className="size-5" aria-hidden="true" />
            </div>
          </header>

          <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-[#050914]">
            <VideoTile
              stream={localStream}
              objectCover
              muted
              mirror={mirror}
              aria-label="Pratinjau video kamu"
              className="h-full w-full"
              placeholder={
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#050914] text-center">
                  <span className="flex size-14 items-center justify-center rounded-2xl bg-white/[0.06]">
                    <Video className="size-6 text-slate-400" aria-hidden="true" />
                  </span>
                  <p className="text-sm font-medium text-slate-300">Menyiapkan pratinjau kamera…</p>
                  <p className="text-xs text-slate-500">Izinkan akses kamera di browser jika diminta.</p>
                </div>
              }
            />
            <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-3 py-1.5 text-xs text-white/90 backdrop-blur">
              <span className={cn('size-2 rounded-full', camOn ? 'bg-emerald-400' : 'bg-rose-400')} />
              {camOn ? 'Kamera aktif' : 'Kamera nonaktif'}
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-3.5">
              <span className="flex items-center gap-3">
                <span className={cn('flex size-9 items-center justify-center rounded-xl', micOn ? 'bg-emerald-400/10 text-emerald-300' : 'bg-rose-400/10 text-rose-300')}>
                  {micOn ? <Mic className="size-4" aria-hidden="true" /> : <MicOff className="size-4" aria-hidden="true" />}
                </span>
                <span>
                  <span className="block text-sm font-medium">Mikrofon</span>
                  <span className="mt-0.5 block text-xs text-slate-400">{micOn ? 'Siap digunakan' : 'Dalam keadaan mati'}</span>
                </span>
              </span>
              <Switch checked={micOn} onCheckedChange={onToggleMic} aria-label={micOn ? 'Matikan mikrofon' : 'Nyalakan mikrofon'} />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-3.5">
              <span className="flex items-center gap-3">
                <span className={cn('flex size-9 items-center justify-center rounded-xl', camOn ? 'bg-emerald-400/10 text-emerald-300' : 'bg-rose-400/10 text-rose-300')}>
                  {camOn ? <Video className="size-4" aria-hidden="true" /> : <VideoOff className="size-4" aria-hidden="true" />}
                </span>
                <span>
                  <span className="block text-sm font-medium">Kamera</span>
                  <span className="mt-0.5 block text-xs text-slate-400">{camOn ? 'Siap digunakan' : 'Dalam keadaan mati'}</span>
                </span>
              </span>
              <Switch checked={camOn} onCheckedChange={onToggleCam} aria-label={camOn ? 'Matikan kamera' : 'Nyalakan kamera'} />
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={onTestSpeaker} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">
              <Volume2 className="size-4" aria-hidden="true" /> Uji speaker
            </button>
            <button type="button" onClick={onToggleMirror} disabled={!camOn} aria-pressed={mirror} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-40">
              <FlipHorizontal className="size-4" aria-hidden="true" /> {mirror ? 'Mirror aktif' : 'Aktifkan mirror'}
            </button>
          </div>
        </section>

        <aside className="flex flex-col rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-7">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-blue-500 shadow-lg shadow-blue-500/20">
              <Video className="size-5" aria-hidden="true" />
            </span>
            <span className="text-xl font-bold tracking-tight">Vu<span className="text-blue-400">Call</span></span>
          </div>

          <div className="mt-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">Ruang panggilan</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Kamu hampir terhubung.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">Bergabung saat sudah siap. Kamu juga bisa mengirim tautan undangan ke teman.</p>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-[#0b1020] p-4">
            <div className="flex items-center gap-2 text-xs text-slate-400"><ShieldCheck className="size-4 text-emerald-300" aria-hidden="true" /> Kode ruang</div>
            <p className="mt-2 break-all font-mono text-lg font-semibold tracking-wider text-white">{roomId}</p>
            <button type="button" onClick={onCopyLink} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">
              {copied ? <Check className="size-4 text-emerald-300" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
              {copied ? 'Tautan disalin' : 'Salin tautan undangan'}
            </button>
          </div>

          <div className="mt-5 flex items-start gap-3 text-xs leading-5 text-slate-400">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-slate-500" aria-hidden="true" />
            <p>Browser mungkin meminta izin kamera dan mikrofon. Kamu bisa mematikannya kapan saja selama panggilan.</p>
          </div>

          <div className="mt-auto pt-8">
            <button type="button" onClick={onJoin} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-4 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900">
              <PhoneCall className="size-4" aria-hidden="true" /> Bergabung ke panggilan
            </button>
            <p className="mt-3 text-center text-xs text-slate-500">Pastikan kamu berada di tempat yang nyaman.</p>
          </div>
        </aside>
      </div>
    </main>
  )
}
