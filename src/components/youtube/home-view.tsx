'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CATEGORIES, type VideoWithChannel } from '@/lib/types'
import { fetchVideos } from '@/lib/api'
import { useNav } from '@/lib/nav'
import { VideoGrid } from '@/components/youtube/video-grid'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

function HomeSkeletons() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3">
          <Skeleton className="aspect-video w-full rounded-xl" />
          <div className="flex gap-3">
            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-2.5 w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyHome() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <h2 className="text-base font-medium text-foreground">No videos here yet</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Try selecting a different category.
      </p>
    </div>
  )
}

export function HomeView() {
  const searchParams = useSearchParams()
  const cat = searchParams.get('cat') || 'All'
  const { goCategory } = useNav()

  const [result, setResult] = useState<{
    key: string
    status: 'loading' | 'error' | 'done'
    data: VideoWithChannel[]
  }>({ key: '', status: 'loading', data: [] })

  useEffect(() => {
    let cancelled = false
    fetchVideos(cat === 'All' ? {} : { category: cat })
      .then((data) => {
        if (!cancelled) setResult({ key: cat, status: 'done', data })
      })
      .catch(() => {
        if (!cancelled) setResult({ key: cat, status: 'error', data: [] })
      })
    return () => {
      cancelled = true
    }
  }, [cat])

  const loading = result.key !== cat || result.status === 'loading'
  const error = result.status === 'error' && result.key === cat
  const videos = result.key === cat ? result.data : []

  return (
    <div className="px-4 py-4 sm:px-6">
      {/* Category chips bar — sticky just below the 56px header */}
      <div className="sticky top-14 z-30 -mx-4 bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:-mx-6 sm:px-6">
        <div className="flex gap-3 overflow-x-auto scrollbar-thin">
          {CATEGORIES.map((name) => {
            const active = name === cat
            return (
              <button
                key={name}
                type="button"
                onClick={() => goCategory(name)}
                aria-pressed={active}
                className={cn(
                  'whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active
                    ? 'bg-foreground text-background'
                    : 'bg-secondary text-secondary-foreground hover:bg-accent',
                )}
              >
                {name}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-4">
        {loading ? (
          <HomeSkeletons />
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <h2 className="text-base font-medium text-foreground">
              Something went wrong
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We couldn&apos;t load videos. Please try again later.
            </p>
          </div>
        ) : videos.length === 0 ? (
          <EmptyHome />
        ) : (
          <VideoGrid videos={videos} />
        )}
      </div>
    </div>
  )
}

export default HomeView
