'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Video, Zap, Shield, Users, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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
    icon: <Shield className="size-4" />,
    text: 'Tanpa drop saat jaringan tidak stabil',
  },
  {
    icon: <Users className="size-4" />,
    text: 'Privat P2P — media tidak lewat server',
  },
]

/**
 * Lobby — the landing screen shown when there is no `?room=` query param.
 *
 * Lets the user start a fresh call (generates a random room id and navigates
 * to `/?room=ID`) or join an existing call by pasting a room code.
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
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(ellipse_at_top,_oklch(0.22_0_0),_oklch(0.12_0_0))] p-4">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center py-10">
        {/* Logo + wordmark */}
        <div className="flex items-center gap-3">
          <div
            aria-hidden="true"
            className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30"
          >
            <Video className="size-6" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Vu<span className="text-primary">Call</span>
          </h1>
        </div>

        {/* Subtitle */}
        <p className="mt-3 text-center text-sm text-muted-foreground">
          Video call 1:1 yang tidak gampang terputus.
        </p>

        {/* Primary CTA */}
        <Button
          type="button"
          onClick={startCall}
          size="lg"
          className="mt-7 w-full rounded-full px-6 py-3 text-base"
        >
          Mulai panggilan
          <ArrowRight className="size-4" />
        </Button>

        {/* Divider */}
        <div className="my-6 flex w-full items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            atau
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>

        {/* Join form */}
        <form onSubmit={joinCall} className="flex w-full items-center gap-2">
          <Input
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Kode ruangan"
            aria-label="Kode ruangan"
            className="flex-1 uppercase placeholder:normal-case"
            maxLength={12}
          />
          <Button
            type="submit"
            variant="secondary"
            disabled={!trimmed}
            className="rounded-full px-5"
          >
            Gabung
          </Button>
        </form>

        {/* Features */}
        <ul className="mt-9 w-full space-y-3">
          {FEATURES.map((f) => (
            <li key={f.text} className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
              >
                {f.icon}
              </span>
              <span className="text-sm text-muted-foreground">{f.text}</span>
            </li>
          ))}
        </ul>

        {/* Footer note */}
        <p className="mt-9 text-center text-xs leading-relaxed text-muted-foreground/80">
          Bagikan tautan ruangan ke teman Anda. Mereka cukup membuka tautan —
          tidak perlu mendaftar.
        </p>
      </div>
    </main>
  )
}
