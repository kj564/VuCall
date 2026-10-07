'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  ShieldCheck,
  Users,
  Video,
  Zap,
} from 'lucide-react'

/** Generate a 6-char uppercase alphanumeric room id. */
function genRoomId(): string {
  return Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()
}

const FEATURES: { icon: React.ReactNode; text: string }[] = [
  {
    icon: <Zap className="size-4" />,
    text: 'Reconnect otomatis saat koneksi hilang',
  },
  {
    icon: <ShieldCheck className="size-4" />,
    text: 'Tanpa drop saat jaringan tidak stabil',
  },
  {
    icon: <Users className="size-4" />,
    text: 'Privat P2P — media tidak lewat server',
  },
]

/**
 * Lobby — landing screen shown when there is no `?room=` query param.
 *
 * Restyled to the videocall-app-ui reference: a soft-shadowed white card on
 * the light app background, indigo logo square, primary CTA, "ATAU" divider,
 * join row, and a 3-item feature list. Behavior is unchanged — generate a
 * 6-char room id → `router.push('/?room=ID')`, or paste-join an existing room.
 */
export function Lobby() {
  const router = useRouter()
  const [code, setCode] = React.useState('')
  const trimmed = code.trim()

  const startCall = () => {
    const id = genRoomId()
    router.push(`/?room=${id}`)
  }

  const joinCall = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!trimmed) return
    router.push(`/?room=${trimmed}`)
  }

  return (
    <main className="flex min-h-[100dvh] w-full items-center justify-center bg-background p-6">
      <div className="vc-shadow flex w-full max-w-md flex-col gap-5 rounded-[16px] bg-card p-8">
        {/* Logo + wordmark */}
        <div className="flex items-center gap-3">
          <div
            aria-hidden="true"
            className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground"
          >
            <Video className="size-6" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Vu<span className="text-primary">Call</span>
          </h1>
        </div>

        {/* Subtitle */}
        <p className="text-sm text-muted-foreground">
          Video call 1:1 yang tidak gampang terputus.
        </p>

        {/* Primary CTA */}
        <button
          type="button"
          onClick={startCall}
          className="w-full rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Mulai panggilan
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            atau
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>

        {/* Join form */}
        <form onSubmit={joinCall} className="flex w-full items-center gap-2">
          <input
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Kode ruangan"
            aria-label="Kode ruangan"
            maxLength={12}
            className="flex-1 rounded-lg border border-transparent bg-secondary px-3 py-3 text-sm text-foreground outline-none focus:border-primary placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            disabled={!trimmed}
            aria-label="Gabung ruangan"
            className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-3 text-sm font-medium text-background transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
          >
            Gabung
            <ArrowRight className="size-4" />
          </button>
        </form>

        {/* Features */}
        <ul className="flex flex-col gap-3">
          {FEATURES.map((f) => (
            <li key={f.text} className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary"
              >
                {f.icon}
              </span>
              <span className="text-sm text-muted-foreground">{f.text}</span>
            </li>
          ))}
        </ul>

        {/* Footer note */}
        <p className="text-center text-xs text-muted-foreground">
          Bagikan tautan ruangan ke teman Anda. Mereka cukup membuka tautan —
          tidak perlu mendaftar.
        </p>
      </div>
    </main>
  )
}
