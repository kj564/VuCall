'use client'

import * as React from 'react'

import { fetchRelatedVideos } from '@/lib/api'
import type { VideoWithChannel } from '@/lib/types'

import { RelatedVideoCard, RelatedVideoCardSkeleton } from './related-video-card'

type RelatedVideosProps = {
  videoId: string
}

export function RelatedVideos({ videoId }: RelatedVideosProps) {
  const [items, setItems] = React.useState<VideoWithChannel[] | null>(null)
  const [error, setError] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    setItems(null)
    setError(false)
    fetchRelatedVideos(videoId)
      .then((data) => {
        if (!cancelled) setItems(data)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [videoId])

  if (error) {
    return (
      <p className="text-sm text-muted-foreground">
        Could not load related videos.
      </p>
    )
  }

  if (!items) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <RelatedVideoCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No related videos yet.</p>
    )
  }

  return (
    <nav className="flex flex-col gap-3" aria-label="Related videos">
      {items.map((v) => (
        <RelatedVideoCard key={v.id} video={v} />
      ))}
    </nav>
  )
}
