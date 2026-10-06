import type { VideoWithChannel } from '@/lib/types'
import { VideoCard } from './video-card'

/**
 * Responsive grid of video cards.
 * 1 col on mobile, 2 on sm, 3 on lg, 4 on xl.
 */
export function VideoGrid({ videos }: { videos: VideoWithChannel[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
      {videos.map((video) => (
        <VideoCard key={video.id} video={video} />
      ))}
    </div>
  )
}

export default VideoGrid
