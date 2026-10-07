// Shared types used across the YouTube-like app (API + frontend)

export type Channel = {
  id: string
  name: string
  handle: string
  avatar: string
  banner: string
  description: string
  subscribers: number
  verified: boolean
  createdAt: string
}

export type Video = {
  id: string
  channelId: string
  title: string
  description: string
  thumbnail: string
  videoUrl: string
  duration: string
  views: number
  likes: number
  dislikes: number
  category: string
  tags: string
  publishedAt: string
}

export type Comment = {
  id: string
  videoId: string
  authorName: string
  authorAvatar: string
  text: string
  likes: number
  createdAt: string
}

export type VideoWithChannel = Video & {
  channel: Pick<
    Channel,
    'id' | 'name' | 'handle' | 'avatar' | 'verified' | 'subscribers'
  >
}

export type ChannelWithVideos = Channel & {
  videos: Video[]
}

export type Category = {
  name: string
}

export const CATEGORIES = [
  'All',
  'Gaming',
  'Tech',
  'Music',
  'Cars',
  'Travel',
  'Cooking',
  'Education',
  'Comedy',
  'Live',
  'Podcasts',
  'News',
  'Recently uploaded',
  'Watched',
] as const

export type CategoryName = (typeof CATEGORIES)[number]
