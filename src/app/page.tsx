'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Lobby } from '@/components/vc/lobby'
import { CallRoom } from '@/components/vc/call-room'

function VCRouter() {
  const sp = useSearchParams()
  const room = sp.get('room')

  // Reset scroll position when entering/leaving a call.
  useEffect(() => {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 })
  }, [room])

  if (room) return <CallRoom />
  return <Lobby />
}

function LoadingFallback() {
  return (
    <div className="flex h-[100dvh] w-full items-center justify-center bg-black">
      <span className="size-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <VCRouter />
    </Suspense>
  )
}
