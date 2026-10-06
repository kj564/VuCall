'use client'

import type { Video } from '@/lib/types'

type VideoPlayerProps = {
  video: Pick<Video, 'videoUrl' | 'thumbnail' | 'title' | 'duration'>
}

// Responsive 16:9 HTML5 video player. The container keeps the aspect ratio,
// the inner <video> fills it. Real sample MP4s are playable.
export function VideoPlayer({ video }: VideoPlayerProps) {
  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
      <video
        key={video.videoUrl}
        src={video.videoUrl}
        poster={video.thumbnail}
        controls
        preload="metadata"
        playsInline
        className="h-full w-full"
      />
    </div>
  )
}
