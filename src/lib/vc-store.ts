'use client'

import { create } from 'zustand'
import type { CallStatus, ChatMessage, NetworkQuality, Reaction } from './webrtc'

export const FILTER_PRESETS = [
  { id: 'none', label: 'Normal', css: 'none' },
  { id: 'vivid', label: 'Vivid', css: 'saturate(1.5) contrast(1.1)' },
  { id: 'warm', label: 'Warm', css: 'sepia(0.4) saturate(1.3) hue-rotate(-10deg)' },
  { id: 'cool', label: 'Cool', css: 'hue-rotate(180deg) saturate(1.2)' },
  { id: 'mono', label: 'Mono', css: 'grayscale(1) contrast(1.1)' },
  { id: 'vintage', label: 'Vintage', css: 'sepia(0.6) contrast(0.9) brightness(1.1)' },
  { id: 'dreamy', label: 'Dreamy', css: 'blur(0.4px) brightness(1.15) saturate(1.2)' },
] as const

export type FilterPreset = (typeof FILTER_PRESETS)[number]

type VCState = {
  roomId: string | null
  role: 'caller' | 'callee' | null
  status: CallStatus
  statusDetail?: string
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  micOn: boolean
  camOn: boolean
  reconnectAttempt: number
  error: string | null
  callStartedAt: number | null

  // In-call feature state
  chatMessages: ChatMessage[]
  reactions: Reaction[]
  localFilter: string // CSS filter value (default 'none')
  networkQuality: NetworkQuality
  chatOpen: boolean
  minimized: boolean
  unreadCount: number

  setRoom: (roomId: string | null, role: 'caller' | 'callee' | null) => void
  setStatus: (status: CallStatus, detail?: string) => void
  setLocalStream: (s: MediaStream | null) => void
  setRemoteStream: (s: MediaStream | null) => void
  setMic: (on: boolean) => void
  setCam: (on: boolean) => void
  setReconnectAttempt: (n: number) => void
  setError: (msg: string | null) => void
  startCallTimer: () => void

  addChat: (msg: ChatMessage) => void
  addReaction: (r: Reaction) => void
  removeReaction: (id: string) => void
  setLocalFilter: (css: string) => void
  setNetworkQuality: (q: NetworkQuality) => void
  setChatOpen: (open: boolean) => void
  setMinimized: (m: boolean) => void
  reset: () => void
}

export const useVCStore = create<VCState>((set) => ({
  roomId: null,
  role: null,
  status: 'idle',
  statusDetail: undefined,
  localStream: null,
  remoteStream: null,
  micOn: true,
  camOn: true,
  reconnectAttempt: 0,
  error: null,
  callStartedAt: null,
  chatMessages: [],
  reactions: [],
  localFilter: 'none',
  networkQuality: 0,
  chatOpen: false,
  minimized: false,
  unreadCount: 0,

  setRoom: (roomId, role) => set({ roomId, role }),
  setStatus: (status, statusDetail) => set({ status, statusDetail }),
  setLocalStream: (localStream) => set({ localStream }),
  setRemoteStream: (remoteStream) => set({ remoteStream }),
  setMic: (micOn) => set({ micOn }),
  setCam: (camOn) => set({ camOn }),
  setReconnectAttempt: (reconnectAttempt) => set({ reconnectAttempt }),
  setError: (error) => set({ error }),
  startCallTimer: () =>
    set((s) => (s.callStartedAt ? s : { callStartedAt: Date.now() })),

  addChat: (msg) =>
    set((s) => ({
      chatMessages: [...s.chatMessages, msg].slice(-200),
      unreadCount: s.chatOpen ? s.unreadCount : s.unreadCount + 1,
    })),
  addReaction: (r) => set((s) => ({ reactions: [...s.reactions, r] })),
  removeReaction: (id) =>
    set((s) => ({ reactions: s.reactions.filter((r) => r.id !== id) })),
  setLocalFilter: (localFilter) => set({ localFilter }),
  setNetworkQuality: (networkQuality) => set({ networkQuality }),
  setChatOpen: (chatOpen) =>
    set((s) => ({ chatOpen, unreadCount: chatOpen ? 0 : s.unreadCount })),
  setMinimized: (minimized) => set({ minimized }),

  reset: () =>
    set({
      roomId: null,
      role: null,
      status: 'idle',
      statusDetail: undefined,
      localStream: null,
      remoteStream: null,
      micOn: true,
      camOn: true,
      reconnectAttempt: 0,
      error: null,
      callStartedAt: null,
      chatMessages: [],
      reactions: [],
      localFilter: 'none',
      networkQuality: 0,
      chatOpen: false,
      minimized: false,
      unreadCount: 0,
    }),
}))
