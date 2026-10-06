'use client'

import * as React from 'react'
import {
  BadgeCheck,
  Bell,
  BellRing,
  Bookmark,
  Share2,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ChannelAvatar } from '@/components/youtube/channel-avatar'
import { useToast } from '@/hooks/use-toast'
import { likeVideo, subscribeChannel } from '@/lib/api'
import {
  formatCompact,
  formatSubscribers,
  formatTimeAgo,
  formatViews,
} from '@/lib/format'
import { useNav } from '@/lib/nav'
import { useUIStore } from '@/lib/store'
import type { VideoWithChannel } from '@/lib/types'
import { cn } from '@/lib/utils'

type VideoInfoProps = {
  video: VideoWithChannel
}

export function VideoInfo({ video }: VideoInfoProps) {
  const { goChannel } = useNav()
  const { toast } = useToast()
  const likedVideos = useUIStore((s) => s.likedVideos)
  const setLiked = useUIStore((s) => s.setLiked)
  const subscribedChannels = useUIStore((s) => s.subscribedChannels)
  const toggleSubscribed = useUIStore((s) => s.toggleSubscribed)

  const likeState = likedVideos[video.id] ?? null
  const subscribed = subscribedChannels[video.channel.id] ?? false

  const [descExpanded, setDescExpanded] = React.useState(false)

  // Local copy of base counts. `displayed = base + (likeState===X?1:0)` so
  // we keep `base` equal to the server's count MINUS our local optimistic
  // delta. On server confirm we re-sync base from the response.
  const [baseLikes, setBaseLikes] = React.useState(video.likes)
  const [baseDislikes, setBaseDislikes] = React.useState(video.dislikes)
  React.useEffect(() => {
    setBaseLikes(video.likes)
    setBaseDislikes(video.dislikes)
  }, [video.id, video.likes, video.dislikes])

  const displayedLikes = baseLikes + (likeState === 'like' ? 1 : 0)
  const displayedDislikes = baseDislikes + (likeState === 'dislike' ? 1 : 0)

  const tags = React.useMemo(
    () =>
      video.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    [video.tags],
  )

  const handleLike = async (next: 'like' | 'dislike') => {
    const current = likeState
    const newState = current === next ? null : next
    // Optimistic store update first.
    setLiked(video.id, newState)
    try {
      const res = await likeVideo(video.id, newState)
      // Strip our optimistic delta so `displayed = base + delta` keeps
      // matching the server's authoritative count.
      setBaseLikes(Math.max(0, res.likes - (newState === 'like' ? 1 : 0)))
      setBaseDislikes(Math.max(0, res.dislikes - (newState === 'dislike' ? 1 : 0)))
    } catch {
      // Revert on failure.
      setLiked(video.id, current)
      toast({ title: 'Could not update rating', description: 'Please try again.' })
    }
  }

  const handleSubscribe = async () => {
    const next = !subscribed
    toggleSubscribed(video.channel.id)
    try {
      await subscribeChannel(video.channel.id, next)
      toast({
        title: next ? 'Subscribed' : 'Unsubscribed',
        description: next
          ? `You'll see new videos from ${video.channel.name}.`
          : `You won't get updates from ${video.channel.name}.`,
      })
    } catch {
      // Revert on failure.
      toggleSubscribed(video.channel.id)
      toast({ title: 'Something went wrong', description: 'Please try again.' })
    }
  }

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    try {
      if (navigator.share) {
        await navigator.share({ title: video.title, url })
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url)
        toast({ title: 'Link copied', description: 'Share it anywhere.' })
      }
    } catch {
      /* user dismissed share sheet — no-op */
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-4">
      <h1 className="text-lg font-semibold leading-snug sm:text-xl">
        {video.title}
      </h1>

      {/* Channel row + actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => goChannel(video.channel.id)}
            className="flex items-center gap-3 rounded-full p-1 pr-2 text-left transition hover:bg-accent/60"
          >
            <ChannelAvatar
              name={video.channel.name}
              src={video.channel.avatar}
              size={40}
            />
            <span className="flex flex-col leading-tight">
              <span className="flex items-center gap-1 text-sm font-semibold">
                {video.channel.name}
                {video.channel.verified && (
                  <BadgeCheck className="size-4 text-muted-foreground" />
                )}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatSubscribers(video.channel.subscribers)}
              </span>
            </span>
          </button>

          <Button
            type="button"
            onClick={handleSubscribe}
            variant={subscribed ? 'secondary' : 'default'}
            className={cn(
              'rounded-full text-sm font-semibold',
              subscribed
                ? 'border border-border bg-transparent text-foreground hover:bg-accent'
                : 'bg-foreground text-background hover:opacity-90',
            )}
          >
            {subscribed ? (
              <>
                <BellRing className="size-4" />
                Subscribed
              </>
            ) : (
              <>
                <Bell className="size-4" />
                Subscribe
              </>
            )}
          </Button>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-stretch overflow-hidden rounded-full bg-secondary text-secondary-foreground">
            <button
              type="button"
              onClick={() => handleLike('like')}
              aria-pressed={likeState === 'like'}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium transition hover:bg-accent',
                likeState === 'like' && 'text-primary',
              )}
            >
              <ThumbsUp
                className="size-4"
                fill={likeState === 'like' ? 'currentColor' : 'none'}
              />
              {formatCompact(displayedLikes)}
            </button>
            <Separator orientation="vertical" className="my-1" />
            <button
              type="button"
              onClick={() => handleLike('dislike')}
              aria-pressed={likeState === 'dislike'}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium transition hover:bg-accent',
                likeState === 'dislike' && 'text-primary',
              )}
            >
              <ThumbsDown
                className="size-4"
                fill={likeState === 'dislike' ? 'currentColor' : 'none'}
              />
              {formatCompact(displayedDislikes)}
            </button>
          </div>

          <Button
            type="button"
            variant="secondary"
            onClick={handleShare}
            className="rounded-full"
          >
            <Share2 className="size-4" />
            Share
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              toast({ title: 'Saved', description: 'Added to your Watch later list.' })
            }
            className="rounded-full"
          >
            <Bookmark className="size-4" />
            Save
          </Button>
        </div>
      </div>

      {/* Description box */}
      <div className="rounded-xl bg-secondary/60 p-3 text-sm">
        <div className="mb-1 font-semibold">
          {formatViews(video.views)} · {formatTimeAgo(video.publishedAt)}
        </div>
        <div className={cn('whitespace-pre-wrap break-words', !descExpanded && 'line-clamp-3')}>
          {video.description || 'No description provided.'}
        </div>
        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {tags.map((t) => (
              <span
                key={t}
                className="rounded bg-background/60 px-1.5 py-0.5 text-xs text-primary"
              >
                #{t.replace(/\s+/g, '')}
              </span>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => setDescExpanded((v) => !v)}
          className="mt-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
        >
          {descExpanded ? 'Show less' : 'Show more'}
        </button>
      </div>
    </div>
  )
}
