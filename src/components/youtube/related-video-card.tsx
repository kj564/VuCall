'use client'

import { BadgeCheck } from 'lucide-react'

import { formatTimeAgo, formatViews } from '@/lib/format'
import { useNav } from '@/lib/nav'
import type { VideoWithChannel } from '@/lib/types'

type RelatedVideoCardProps = {
  video: VideoWithChannel
}

// Compact horizontal card for the watch sidebar.
export function RelatedVideoCard({ video }: RelatedVideoCardProps) {
  const { goWatch, goChannel } = useNav()

  return (
    <article
      onClick={() => goWatch(video.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          goWatch(video.id)
        }
      }}
      className="group flex cursor-pointer gap-2"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-40 shrink-0 overflow-hidden rounded-lg bg-muted sm:w-44">
        { }
        <img
          src={video.thumbnail}
          alt={video.title}
          loading="lazy"
          className="h-full w-full object-cover transition group-hover:opacity-80"
        />
        <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-[10px] font-medium text-white">
          {video.duration}
        </span>
      </div>

      {/* Text column */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug">
          {video.title}
        </h3>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            goChannel(video.channel.id)
          }}
          className="flex w-fit items-center gap-1 text-left text-xs text-muted-foreground transition hover:text-foreground"
        >
          <span className="truncate">{video.channel.name}</span>
          {video.channel.verified && (
            <BadgeCheck className="size-3 shrink-0" />
          )}
        </button>
        <div className="text-xs text-muted-foreground">
          {formatViews(video.views)} · {formatTimeAgo(video.publishedAt)}
        </div>
      </div>
    </article>
  )
}

// Skeleton variant used during loading.
export function RelatedVideoCardSkeleton() {
  return (
    <div className="flex gap-2">
      <div className="aspect-video w-40 shrink-0 rounded-lg bg-accent sm:w-44" />
      <div className="flex min-w-0 flex-1 flex-col gap-2 py-1">
        <div className="h-3 w-full rounded bg-accent" />
        <div className="h-3 w-2/3 rounded bg-accent" />
        <div className="h-2.5 w-1/2 rounded bg-accent" />
      </div>
    </div>
  )
}
