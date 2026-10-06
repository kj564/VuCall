'use client'

import { useState } from 'react'
import { BadgeCheck, Film } from 'lucide-react'
import type { VideoWithChannel } from '@/lib/types'
import { formatViews, formatTimeAgo } from '@/lib/format'
import { useNav } from '@/lib/nav'
import { ChannelAvatar } from '@/components/youtube/channel-avatar'

function activateOnKey(e: React.KeyboardEvent, fn: () => void) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    fn()
  }
}

/**
 * A single video card used across the Home grid and Search list.
 * Clicking the thumbnail or title navigates to the watch view,
 * while clicking the channel avatar / name navigates to the channel page.
 */
export function VideoCard({ video }: { video: VideoWithChannel }) {
  const { goWatch, goChannel } = useNav()
  const [imgError, setImgError] = useState(false)
  const channel = video.channel

  return (
    <article className="group flex flex-col">
      {/* Thumbnail — clickable to watch */}
      <button
        type="button"
        onClick={() => goWatch(video.id)}
        aria-label={`Watch ${video.title}`}
        className="relative block aspect-video w-full overflow-hidden rounded-xl bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
            className="h-full w-full object-cover transition-transform duration-200 ease-out group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        )}
        <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white">
          {video.duration}
        </span>
      </button>

      {/* Meta row — channel avatar + title + meta */}
      <div className="mt-3 flex gap-3">
        <button
          type="button"
          onClick={() => goChannel(channel.id)}
          aria-label={`Go to ${channel.name} channel`}
          className="mt-0.5 shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <ChannelAvatar name={channel.name} src={channel.avatar} size={36} />
        </button>

        <div className="min-w-0 flex-1">
          {/* Title — clickable to watch */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => goWatch(video.id)}
            onKeyDown={(e) => activateOnKey(e, () => goWatch(video.id))}
            className="cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <h3 className="line-clamp-2 text-sm font-medium leading-snug text-foreground transition-colors group-hover:text-foreground">
              {video.title}
            </h3>
          </div>

          {/* Channel name — clickable to channel */}
          <button
            type="button"
            onClick={() => goChannel(channel.id)}
            aria-label={`Go to ${channel.name} channel`}
            className="mt-1 flex w-full items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <span className="truncate">{channel.name}</span>
            {channel.verified && (
              <BadgeCheck className="h-3 w-3 shrink-0 text-muted-foreground" />
            )}
          </button>

          <div className="mt-0.5 text-xs text-muted-foreground">
            {formatViews(video.views)} • {formatTimeAgo(video.publishedAt)}
          </div>
        </div>
      </div>
    </article>
  )
}

export default VideoCard
