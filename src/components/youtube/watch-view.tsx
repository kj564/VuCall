'use client'

import * as React from 'react'
import { useSearchParams } from 'next/navigation'
import { Home as HomeIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Comments } from '@/components/youtube/comments'
import { RelatedVideos } from '@/components/youtube/related-videos'
import { VideoInfo } from '@/components/youtube/video-info'
import { VideoPlayer } from '@/components/youtube/video-player'
import { fetchVideo } from '@/lib/api'
import { useNav } from '@/lib/nav'
import type { Comment, VideoWithChannel } from '@/lib/types'

export function WatchView() {
  const searchParams = useSearchParams()
  const videoId = searchParams.get('v')
  const { goHome } = useNav()

  const [data, setData] = React.useState<{
    video: VideoWithChannel
    comments: Comment[]
  } | null>(null)
  const [error, setError] = React.useState(false)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (!videoId) {
      setLoading(false)
      setError(true)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(false)
    setData(null)
    fetchVideo(videoId)
      .then((res) => {
        if (!cancelled) setData(res)
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
  }, [videoId])

  if (!videoId || (error && !loading)) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 py-12 text-center">
        <h2 className="text-xl font-semibold">Video not found</h2>
        <p className="text-sm text-muted-foreground">
          The video you were looking for is unavailable.
        </p>
        <Button onClick={goHome} className="mt-2 gap-2 rounded-full">
          <HomeIcon className="size-4" />
          Back to home
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-4 sm:px-6 xl:flex-row">
      {/* Main column */}
      <main className="min-w-0 flex-1">
        {loading || !data ? (
          <WatchSkeleton />
        ) : (
          <>
            <VideoPlayer video={data.video} />
            <VideoInfo video={data.video} />
            <Separator className="my-4" />
            <Comments videoId={data.video.id} comments={data.comments} />
          </>
        )}
      </main>

      {/* Sidebar */}
      <aside className="flex flex-col gap-3 xl:w-[402px] xl:shrink-0">
        {loading || !data ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-2">
                <Skeleton className="aspect-video w-40 shrink-0 rounded-lg sm:w-44" />
                <div className="flex flex-1 flex-col gap-2 py-1">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-2.5 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <RelatedVideos videoId={data.video.id} />
        )}
      </aside>
    </div>
  )
}

function WatchSkeleton() {
  return (
    <>
      <Skeleton className="aspect-video w-full rounded-xl" />
      <div className="mt-4 flex flex-col gap-3">
        <Skeleton className="h-6 w-3/4" />
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    </>
  )
}
