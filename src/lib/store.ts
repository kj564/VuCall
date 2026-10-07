'use client'

import { create } from 'zustand'

export type View = 'home' | 'watch' | 'channel' | 'search'

type UIState = {
  // Transient UI state (URL drives navigation, store holds ephemeral bits)
  sidebarOpen: boolean
  searchInput: string
  // optimistic like / subscribe state keyed by id
  likedVideos: Record<string, 'like' | 'dislike' | null>
  subscribedChannels: Record<string, boolean>
  // mobile: whether the full sidebar drawer is open
  mobileNavOpen: boolean

  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setSearchInput: (q: string) => void
  setMobileNavOpen: (open: boolean) => void

  setLiked: (videoId: string, state: 'like' | 'dislike' | null) => void
  toggleSubscribed: (channelId: string) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  searchInput: '',
  mobileNavOpen: false,
  likedVideos: {},
  subscribedChannels: {},

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSearchInput: (q) => set({ searchInput: q }),
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),

  setLiked: (videoId, state) =>
    set((s) => ({ likedVideos: { ...s.likedVideos, [videoId]: state } })),

  toggleSubscribed: (channelId) =>
    set((s) => ({
      subscribedChannels: {
        ...s.subscribedChannels,
        [channelId]: !s.subscribedChannels[channelId],
      },
    })),
}))
