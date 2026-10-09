'use client'

import { create } from 'zustand'
import type { CallStatus, NetworkQuality } from './webrtc'
import type { ChatMessage, ReactionEvent } from './signaling'

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
  networkQuality: NetworkQuality

  // Native Picture-in-Picture (real browser/OS PiP on the remote video) + self-view visibility.
  pipActive: boolean
  selfHidden: boolean
  // Screen-share (replaces camera video with display media) + full-screen.
  sharing: boolean
  fullscreen: boolean
  // Mirror the front (user) camera preview; back camera is never mirrored.
  mirror: boolean
  facing: 'user' | 'environment'
  // Call recording (MediaRecorder on the remote stream → download webm).
  recording: boolean

  // In-call text chat (sent/received over MQTT — works on static hosting).
  chatOpen: boolean
  chatMessages: ChatMessage[]
  unreadCount: number
  // Floating emoji reactions (Instagram-style) sent over MQTT.
  reactions: ReactionEvent[]

  // Snapshot capture (PNG download of the remote video frame).
  snapshotFlash: number // epoch ms of the last shutter flash (0 = none)

  setRoom: (roomId: string | null, role: 'caller' | 'callee' | null) => void
  setStatus: (status: CallStatus, detail?: string) => void
  setLocalStream: (s: MediaStream | null) => void
  setRemoteStream: (s: MediaStream | null) => void
  setMic: (on: boolean) => void
  setCam: (on: boolean) => void
  setReconnectAttempt: (n: number) => void
  setError: (msg: string | null) => void
  startCallTimer: () => void
  setNetworkQuality: (q: NetworkQuality) => void
  setPipActive: (v: boolean) => void
  setSelfHidden: (v: boolean) => void
  setSharing: (v: boolean) => void
  setFullscreen: (v: boolean) => void
  setMirror: (v: boolean) => void
  setFacing: (v: 'user' | 'environment') => void
  setRecording: (v: boolean) => void
  setChatOpen: (v: boolean) => void
  pushChat: (m: ChatMessage) => void
  clearChat: () => void
  markChatRead: () => void
  pushReaction: (r: ReactionEvent) => void
  dropReaction: (id: string) => void
  triggerSnapshotFlash: () => void
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
  networkQuality: 0,
  pipActive: false,
  selfHidden: false,
  sharing: false,
  fullscreen: false,
  mirror: true,
  facing: 'user',
  recording: false,
  chatOpen: false,
  chatMessages: [],
  unreadCount: 0,
  reactions: [],
  snapshotFlash: 0,

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
  setNetworkQuality: (networkQuality) => set({ networkQuality }),
  setPipActive: (pipActive) => set({ pipActive }),
  setSelfHidden: (selfHidden) => set({ selfHidden }),
  setSharing: (sharing) => set({ sharing }),
  setFullscreen: (fullscreen) => set({ fullscreen }),
  setMirror: (mirror) => set({ mirror }),
  setFacing: (facing) => set({ facing }),
  setRecording: (recording) => set({ recording }),
  setChatOpen: (chatOpen) =>
    set((s) => (chatOpen ? { chatOpen, unreadCount: 0 } : { chatOpen })),
  pushChat: (m) =>
    set((s) => ({
      chatMessages: [...s.chatMessages, m],
      unreadCount: s.chatOpen ? 0 : s.unreadCount + (m.from === 'peer' ? 1 : 0),
    })),
  clearChat: () => set({ chatMessages: [], unreadCount: 0 }),
  markChatRead: () => set({ unreadCount: 0 }),
  pushReaction: (r) => set((s) => ({ reactions: [...s.reactions, r] })),
  dropReaction: (id) =>
    set((s) => ({ reactions: s.reactions.filter((r) => r.id !== id) })),
  triggerSnapshotFlash: () => set({ snapshotFlash: Date.now() }),

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
      networkQuality: 0,
      pipActive: false,
      selfHidden: false,
      sharing: false,
      fullscreen: false,
      mirror: true,
      facing: 'user',
      recording: false,
      chatOpen: false,
      chatMessages: [],
      unreadCount: 0,
      reactions: [],
      snapshotFlash: 0,
    }),
}))