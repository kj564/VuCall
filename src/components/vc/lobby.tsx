'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  Check,
  Copy,
  MessageCircle,
  Mic,
  Plus,
  ShieldCheck,
  Sparkles,
  Heart,
  Video,
  Wifi,
  Zap,
} from 'lucide-react'

function genRoomId(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

const highlights = [
  { icon: Wifi, title: 'Tetap terhubung', detail: 'Panggilan langsung untuk momen berdua.' },
  { icon: ShieldCheck, title: 'Kontrol tetap di tanganmu', detail: 'Atur kamera dan mikrofon sebelum masuk.' },
  { icon: Zap, title: 'Mudah untuk memulai', detail: 'Kirim satu tautan, lalu ngobrol bersama.' },
]

export function Lobby() {
  const router = useRouter()
  const [roomName, setRoomName] = React.useState('')
  const [copied, setCopied] = React.useState(false)
  const trimmedName = roomName.trim().toLowerCase().replace(/[^a-z0-9-]/g, '')

  const startCall = () => {
    const id = trimmedName || genRoomId()
    router.push(`/?room=${encodeURIComponent(id)}`)
  }

  const joinCall = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!trimmedName) return
    router.push(`/?room=${encodeURIComponent(trimmedName)}`)
  }

  const copyInvite = async () => {
    const id = trimmedName || genRoomId()
    const url = new URL(window.location.href)
    url.searchParams.set('room', id)
    try {
      await navigator.clipboard.writeText(url.toString())
      setRoomName(id)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setRoomName(id)
    }
  }

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#0b1020] text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 size-[30rem] rounded-full bg-blue-600/20 blur-[110px]" />
        <div className="absolute -right-32 top-1/3 size-[28rem] rounded-full bg-violet-600/15 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] bg-[size:28px_28px] opacity-40" />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-6 sm:px-8 lg:px-12">
        <a href="/" className="flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400" aria-label="VuCall beranda">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-blue-500 shadow-lg shadow-blue-500/25">
            <Video className="size-5 text-white" aria-hidden="true" />
          </span>
          <span className="text-xl font-bold tracking-tight">Vu<span className="text-blue-400">Call</span></span>
        </a>
        <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300 sm:flex">
          <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.7)]" />
          Lebih dekat meski berjauhan
        </div>
      </header>

      <section className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-12 px-5 pb-12 pt-8 sm:px-8 md:pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-12 lg:pb-20">
        <div className="max-w-2xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-3.5 py-2 text-xs font-medium text-blue-200">
            <Sparkles className="size-3.5" aria-hidden="true" />
            Lebih dekat, meski berjauhan
          </div>
          <h1 className="max-w-xl text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
            Obrolan yang terasa
            <span className="block bg-gradient-to-r from-blue-300 via-sky-400 to-violet-300 bg-clip-text pb-2 text-transparent">lebih dekat.</span>
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-300 sm:text-lg">
            Tempat untuk pasangan LDR saling menyapa lewat video call 1:1—lebih sederhana untuk memulai, dengan upaya menyambung kembali saat jaringan terputus.
          </p>

          <div className="mt-9 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 backdrop-blur">
              <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-300">
                <Video className="size-5" aria-hidden="true" />
              </div>
              <p className="font-semibold">Video call 1:1</p>
              <p className="mt-1 text-sm leading-5 text-slate-400">Tatap muka berdua, dengan kontrol kamera dan mikrofon.</p>
              <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300"><Check className="size-3.5" /> Tersedia</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 backdrop-blur">
              <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
                <Heart className="size-5" aria-hidden="true" />
              </div>
              <p className="font-semibold">Dibuat untuk pasangan LDR</p>
              <p className="mt-1 text-sm leading-5 text-slate-400">Ruang privat untuk ngobrol, melepas rindu, dan berbagi cerita dari jauh.</p>
              <span className="mt-3 inline-flex rounded-full border border-white/10 px-2.5 py-1 text-xs text-slate-400">Fokus VuCall</span>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-start">
            {highlights.map(({ icon: Icon, title, detail }) => (
              <div key={title} className="flex gap-3 sm:flex-1">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.07] text-slate-200">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-200">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto w-full max-w-lg">
          <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-2 shadow-2xl shadow-black/40 backdrop-blur-xl">
            <div className="rounded-[1.55rem] border border-white/[0.06] bg-[#11182b] p-6 sm:p-8">
              <div className="mb-7 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-blue-300">MULAI DI SINI</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight">Siap untuk terhubung?</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-400">Buat ruang untuk kalian berdua atau masukkan kode undangan pasanganmu.</p>
                </div>
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-blue-300">
                  <MessageCircle className="size-5" aria-hidden="true" />
                </span>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); startCall() }} className="space-y-3">
                <label htmlFor="room-name" className="block text-sm font-medium text-slate-200">Nama ruang <span className="font-normal text-slate-500">(opsional)</span></label>
                <input
                  id="room-name"
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  spellCheck={false}
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="contoh: kita-malam-ini"
                  maxLength={30}
                  className="w-full rounded-xl border border-white/10 bg-[#0b1020] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-blue-400 focus:ring-4 focus:ring-blue-400/10"
                />
                <button type="submit" className="group flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900">
                  <Video className="size-4" aria-hidden="true" />
                  Buat ruang panggilan
                  <ArrowRight className="ml-auto size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </button>
              </form>

              <div className="my-6 flex items-center gap-3" aria-hidden="true">
                <span className="h-px flex-1 bg-white/10" />
                <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">atau gabung</span>
                <span className="h-px flex-1 bg-white/10" />
              </div>

              <form onSubmit={joinCall} className="flex gap-2">
                <input
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="Masukkan kode pasangan"
                  aria-label="Kode ruang untuk bergabung"
                  maxLength={30}
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#0b1020] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400 focus:ring-4 focus:ring-blue-400/10"
                />
                <button type="submit" disabled={!trimmedName} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-35">
                  Gabung <ArrowRight className="size-4" aria-hidden="true" />
                </button>
              </form>

              <button type="button" onClick={copyInvite} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/[0.04] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">
                {copied ? <Check className="size-4 text-emerald-300" /> : <Copy className="size-4" />}
                {copied ? 'Tautan undangan disalin' : 'Buat dan salin tautan undangan'}
              </button>

              <div className="mt-6 flex items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5">
                <Mic className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden="true" />
                <p className="text-xs leading-5 text-slate-400">Browser akan meminta izin kamera dan mikrofon sebelum kamu masuk ke panggilan.</p>
              </div>
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-slate-500">VuCall · Ruang untuk percakapan yang berarti</p>
        </div>
      </section>
    </main>
  )
}
