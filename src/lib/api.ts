// Client-side API helpers for the YouTube-like app.
// All requests use relative paths so the Caddy gateway handles routing.

import type {
  ChannelWithVideos,
  Comment,
  VideoWithChannel,
} from './types'

export async function fetchVideos(opts?: {
  category?: string
  q?: string
  channelId?: string
  limit?: number
}): Promise<VideoWithChannel[]> {
  const params = new URLSearchParams()
  if (opts?.category) params.set('category', opts.category)
  if (opts?.q) params.set('q', opts.q)
  if (opts?.channelId) params.set('channelId', opts.channelId)
  if (opts?.limit) params.set('limit', String(opts.limit))
  const res = await fetch(`/api/videos?${params.toString()}`, {
    cache: 'no-store',
  })
  if (!res.ok) throw new Error('Failed to fetch videos')
  return res.json()
}

export async function fetchVideo(id: string): Promise<{
  video: VideoWithChannel
  comments: Comment[]
}> {
  const res = await fetch(`/api/videos/${encodeURIComponent(id)}?include=comments`, {
    cache: 'no-store',
  })
  if (!res.ok) throw new Error('Failed to fetch video')
  return res.json()
}

export async function fetchChannel(id: string): Promise<ChannelWithVideos> {
  const res = await fetch(`/api/channels/${encodeURIComponent(id)}`, {
    cache: 'no-store',
  })
  if (!res.ok) throw new Error('Failed to fetch channel')
  return res.json()
}

export async function fetchRelatedVideos(videoId: string, limit = 12): Promise<VideoWithChannel[]> {
  const res = await fetch(
    `/api/videos?relatedTo=${encodeURIComponent(videoId)}&limit=${limit}`,
    { cache: 'no-store' },
  )
  if (!res.ok) throw new Error('Failed to fetch related videos')
  return res.json()
}

export async function likeVideo(
  id: string,
  state: 'like' | 'dislike' | null,
): Promise<{ likes: number; dislikes: number }> {
  const res = await fetch(`/api/videos/${encodeURIComponent(id)}/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state }),
  })
  if (!res.ok) throw new Error('Failed to update like')
  return res.json()
}

export async function subscribeChannel(
  id: string,
  subscribe: boolean,
): Promise<{ subscribers: number; subscribed: boolean }> {
  const res = await fetch(`/api/channels/${encodeURIComponent(id)}/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscribe }),
  })
  if (!res.ok) throw new Error('Failed to update subscription')
  return res.json()
}

export async function addComment(
  videoId: string,
  text: string,
): Promise<Comment> {
  const res = await fetch('/api/comments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoId, text }),
  })
  if (!res.ok) throw new Error('Failed to post comment')
  return res.json()
}
