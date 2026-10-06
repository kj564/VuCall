'use client'

import { create } from 'zustand'
import type { CallStatus } from './webrtc'

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

  setRoom: (roomId: string | null, role: 'caller' | 'callee' | null) => void
  setStatus: (status: CallStatus, detail?: string) => void
  setLocalStream: (s: MediaStream | null) => void
  setRemoteStream: (s: MediaStream | null) => void
  setMic: (on: boolean) => void
  setCam: (on: boolean) => void
  setReconnectAttempt: (n: number) => void
  setError: (msg: string | null) => void
  startCallTimer: () => void
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
    }),
}))
