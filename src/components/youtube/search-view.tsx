'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { BadgeCheck, Film, SearchX } from 'lucide-react'
import type { VideoWithChannel } from '@/lib/types'
import { fetchVideos } from '@/lib/api'
import { formatCompact, formatViews, formatTimeAgo } from '@/lib/format'
import { useNav } from '@/lib/nav'
import { ChannelAvatar } from '@/components/youtube/channel-avatar'
import { Skeleton } from '@/components/ui/skeleton'

function activateOnKey(e: React.KeyboardEvent, fn: () => void) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    fn()
  }
}

function SearchRow({ video }: { video: VideoWithChannel }) {
  const { goWatch, goChannel } = useNav()
  const [imgError, setImgError] = useState(false)
  const channel = video.channel

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      {/* Thumbnail — clickable to watch */}
      <button
        type="button"
        onClick={() => goWatch(video.id)}
        aria-label={`Watch ${video.title}`}
        className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-muted sm:max-w-[360px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {imgError ? (
          <div className="flex h-full w-full items-center justify-center">
            <Film className="h-10 w-10 text-muted-foreground/50" />
          </div>
        ) : (
           
          <img
            src={video.thumbnail}
            alt={video.title}
            loading="lazy"
            className="h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
        )}
        <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white">
          {video.duration}
        </span>
      </button>

      {/* Details */}
      <div className="min-w-0 flex-1">
        <div
          role="button"
          tabIndex={0}
          onClick={() => goWatch(video.id)}
          onKeyDown={(e) => activateOnKey(e, () => goWatch(video.id))}
          className="cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <h3 className="line-clamp-2 text-base font-medium leading-snug text-foreground sm:text-lg">
            {video.title}
          </h3>
        </div>

        <div className="mt-1 text-xs text-muted-foreground">
          {formatViews(video.views)} • {formatTimeAgo(video.publishedAt)}
        </div>

        <button
          type="button"
          onClick={() => goChannel(channel.id)}
          aria-label={`Go to ${channel.name} channel`}
          className="mt-2 flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChannelAvatar name={channel.name} src={channel.avatar} size={24} />
          <span className="truncate">{channel.name}</span>
          {channel.verified && (
            <BadgeCheck className="h-3 w-3 shrink-0 text-muted-foreground" />
          )}
        </button>

        {video.description ? (
          <p className="mt-2 line-clamp-3 text-xs text-muted-foreground sm:text-sm">
            {video.description}
          </p>
        ) : null}
      </div>
    </div>
  )
}

function SearchRowSkeleton() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Skeleton className="aspect-video w-full shrink-0 rounded-xl sm:max-w-[360px]" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
      </div>
    </div>
  )
}

export function SearchView() {
  const searchParams = useSearchParams()
  const q = searchParams.get('q') || ''

  const [result, setResult] = useState<{
    key: string
    status: 'loading' | 'error' | 'done'
    data: VideoWithChannel[]
  }>({ key: '', status: 'loading', data: [] })

  useEffect(() => {
    let cancelled = false
    fetchVideos(q ? { q } : {})
      .then((data) => {
        if (!cancelled) setResult({ key: q, status: 'done', data })
      })
      .catch(() => {
        if (!cancelled) setResult({ key: q, status: 'error', data: [] })
      })
    return () => {
      cancelled = true
    }
  }, [q])

  const loading = result.key !== q || result.status === 'loading'
  const error = result.status === 'error' && result.key === q
  const videos = result.key === q ? result.data : []

  return (
    <div className="px-4 py-4 sm:px-6">
      <header className="mb-4">
        <h1 className="text-lg font-semibold text-foreground sm:text-xl">
          Results for &ldquo;{q}&rdquo;
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {loading
            ? 'Searching…'
            : `${formatCompact(videos.length)} ${
                videos.length === 1 ? 'result' : 'results'
              }`}
        </p>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <SearchRowSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <h2 className="text-base font-medium text-foreground">
            Something went wrong
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            We couldn&apos;t complete your search. Please try again later.
          </p>
        </div>
      ) : videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <SearchX className="h-12 w-12 text-muted-foreground/60" />
          <h2 className="mt-4 text-base font-medium text-foreground">
            No results found for &lsquo;{q}&rsquo;
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Try different keywords or remove search filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
          {videos.map((video) => (
            <SearchRow key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  )
}

export default SearchView
