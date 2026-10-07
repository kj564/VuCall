'use client'

import * as React from 'react'
import { useSearchParams } from 'next/navigation'
import { BadgeCheck, Bell, BellRing, Home as HomeIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChannelAvatar } from '@/components/youtube/channel-avatar'
import { useToast } from '@/hooks/use-toast'
import { fetchChannel, subscribeChannel } from '@/lib/api'
import {
  formatSubscribers,
  formatTimeAgo,
  formatViews,
} from '@/lib/format'
import { useNav } from '@/lib/nav'
import { useUIStore } from '@/lib/store'
import type { ChannelWithVideos } from '@/lib/types'
import { cn } from '@/lib/utils'

export function ChannelView() {
  const searchParams = useSearchParams()
  const channelId = searchParams.get('c')
  const { goHome, goWatch } = useNav()

  const [channel, setChannel] = React.useState<ChannelWithVideos | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(false)

  React.useEffect(() => {
    if (!channelId) {
      setLoading(false)
      setError(true)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(false)
    setChannel(null)
    fetchChannel(channelId)
      .then((c) => {
        if (!cancelled) setChannel(c)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [channelId])

  if (!channelId || (error && !loading)) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 py-12 text-center">
        <h2 className="text-xl font-semibold">Channel not found</h2>
        <p className="text-sm text-muted-foreground">
          This channel is unavailable or does not exist.
        </p>
        <Button onClick={goHome} className="mt-2 gap-2 rounded-full">
          <HomeIcon className="size-4" />
          Back to home
        </Button>
      </div>
    )
  }

  if (loading || !channel) {
    return <ChannelSkeleton />
  }

  return <ChannelContent channel={channel} onWatch={goWatch} />
}

function ChannelContent({
  channel,
  onWatch,
}: {
  channel: ChannelWithVideos
  onWatch: (id: string) => void
}) {
  const { toast } = useToast()
  const subscribedChannels = useUIStore((s) => s.subscribedChannels)
  const toggleSubscribed = useUIStore((s) => s.toggleSubscribed)
  const subscribed = subscribedChannels[channel.id] ?? false

  const [descExpanded, setDescExpanded] = React.useState(false)

  const handleSubscribe = async () => {
    const next = !subscribed
    toggleSubscribed(channel.id)
    try {
      await subscribeChannel(channel.id, next)
      toast({
        title: next ? 'Subscribed' : 'Unsubscribed',
        description: next
          ? `You'll see new videos from ${channel.name}.`
          : `You won't get updates from ${channel.name}.`,
      })
    } catch {
      toggleSubscribed(channel.id)
      toast({ title: 'Something went wrong', description: 'Please try again.' })
    }
  }

  return (
    <div className="py-4">
      {/* Banner — bleeds (no horizontal padding) */}
      <div className="aspect-[6/1] w-full overflow-hidden rounded-2xl bg-muted sm:aspect-[7/1]">
        { }
        <img
          src={channel.banner}
          alt={`${channel.name} banner`}
          className="h-full w-full object-cover"
        />
      </div>

      {/* Header row */}
      <div className="mt-[-48px] flex flex-col items-center gap-4 px-4 sm:flex-row sm:items-end sm:gap-6 sm:px-6">
        <div className="rounded-full ring-4 ring-background">
          <ChannelAvatar
            name={channel.name}
            src={channel.avatar}
            size={96}
          />
        </div>

        <div className="flex flex-1 flex-col gap-1 text-center sm:text-left">
          <div className="flex items-center justify-center gap-2 sm:justify-start">
            <h1 className="text-xl font-bold md:text-2xl">{channel.name}</h1>
            {channel.verified && (
              <BadgeCheck className="size-5 text-muted-foreground" />
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground sm:justify-start">
            <span className="font-medium text-foreground">@{channel.handle}</span>
            <span aria-hidden>·</span>
            <span>{formatSubscribers(channel.subscribers)}</span>
            <span aria-hidden>·</span>
            <span>{channel.videos.length} video{channel.videos.length === 1 ? '' : 's'}</span>
          </div>
          <p
            className={cn(
              'mx-auto max-w-2xl text-sm text-muted-foreground sm:mx-0',
              !descExpanded && 'line-clamp-2',
            )}
          >
            {channel.description || 'No description provided.'}
          </p>
          <button
            type="button"
            onClick={() => setDescExpanded((v) => !v)}
            className="mx-auto text-xs font-semibold text-muted-foreground transition hover:text-foreground sm:mx-0"
          >
            {descExpanded ? 'Show less' : '...more'}
          </button>
        </div>

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

      {/* Tabs */}
      <div className="mt-6 px-4 sm:px-6">
        <Tabs defaultValue="videos" className="w-full">
          <TabsList>
            <TabsTrigger value="videos">Videos</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>

          <TabsContent value="videos" className="mt-4">
            {channel.videos.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                This channel has not uploaded any videos yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {channel.videos.map((v) => (
                  <ChannelVideoCard key={v.id} video={v} onWatch={onWatch} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="about" className="mt-4">
            <div className="max-w-2xl rounded-xl bg-secondary/60 p-4 text-sm">
              <h2 className="mb-2 text-base font-semibold">Description</h2>
              <p className="whitespace-pre-wrap break-words text-muted-foreground">
                {channel.description || 'No description provided.'}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-4 text-sm">
                <div className="text-muted-foreground">Joined</div>
                <div>{formatTimeAgo(channel.createdAt)}</div>
                <div className="text-muted-foreground">Subscribers</div>
                <div>{formatSubscribers(channel.subscribers)}</div>
                <div className="text-muted-foreground">Total videos</div>
                <div>{channel.videos.length}</div>
                <div className="text-muted-foreground">Total views</div>
                <div>
                  {formatViews(
                    channel.videos.reduce((sum, v) => sum + v.views, 0),
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// Inline grid card. Deliberately self-contained so this view does not depend
// on a sibling agent's VideoCard / VideoGrid work.
function ChannelVideoCard({
  video,
  onWatch,
}: {
  video: ChannelWithVideos['videos'][number]
  onWatch: (id: string) => void
}) {
  return (
    <article
      onClick={() => onWatch(video.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onWatch(video.id)
        }
      }}
      className="group flex cursor-pointer flex-col gap-3"
    >
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-muted">
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
      <div className="flex flex-col gap-1">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug">
          {video.title}
        </h3>
        <div className="text-xs text-muted-foreground">
          {formatViews(video.views)} · {formatTimeAgo(video.publishedAt)}
        </div>
      </div>
    </article>
  )
}

function ChannelSkeleton() {
  return (
    <div className="py-4">
      <Skeleton className="aspect-[6/1] w-full rounded-2xl sm:aspect-[7/1]" />
      <div className="mt-[-48px] flex flex-col items-center gap-4 px-4 sm:flex-row sm:items-end sm:gap-6 sm:px-6">
        <Skeleton className="size-24 rounded-full ring-4 ring-background" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-9 w-32 rounded-full" />
      </div>
      <div className="mt-6 px-4 sm:px-6">
        <Skeleton className="h-9 w-40 rounded-lg" />
        <div className="mt-4 grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3">
              <Skeleton className="aspect-video w-full rounded-xl" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
