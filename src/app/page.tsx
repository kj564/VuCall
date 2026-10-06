'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { AppShell } from '@/components/youtube/app-shell'
import { HomeView } from '@/components/youtube/home-view'
import { WatchView } from '@/components/youtube/watch-view'
import { ChannelView } from '@/components/youtube/channel-view'
import { SearchView } from '@/components/youtube/search-view'

function ViewRouter() {
  const sp = useSearchParams()
  const v = sp.get('v')
  const c = sp.get('c')
  const q = sp.get('q')

  // Scroll to top whenever the active view changes.
  useEffect(() => {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 })
  }, [v, c, q])

  if (v) return <WatchView />
  if (c) return <ChannelView />
  if (q) return <SearchView />
  return <HomeView />
}

function HomeFallback() {
  return (
    <div className="px-4 sm:px-6 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3">
          <div className="aspect-video w-full rounded-xl bg-muted/60 animate-pulse" />
          <div className="flex gap-3">
            <div className="size-9 rounded-full bg-muted/60 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-3/4 rounded bg-muted/60 animate-pulse" />
              <div className="h-2.5 w-1/2 rounded bg-muted/60 animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Page() {
  return (
    <AppShell>
      <Suspense fallback={<HomeFallback />}>
        <ViewRouter />
      </Suspense>
    </AppShell>
  )
}
