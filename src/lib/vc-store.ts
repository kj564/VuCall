'use client'

import { create } from 'zustand'
import type { CallStatus, NetworkQuality } from './webrtc'

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
    }),
}))