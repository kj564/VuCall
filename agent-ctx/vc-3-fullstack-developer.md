# Task vc-3 — VC presentational UI

## Files created (all `'use client'`, no `any`, accessible)

1. `src/components/vc/video-tile.tsx` — `VideoTile`
2. `src/components/vc/call-controls.tsx` — `CallControls`
3. `src/components/vc/reconnecting-overlay.tsx` — `ReconnectingOverlay`
4. `src/components/vc/call-timer.tsx` — `CallTimer`
5. `src/components/vc/lobby.tsx` — `Lobby`

## Import paths (for the call-room orchestrator)

```ts
import { VideoTile } from '@/components/vc/video-tile'
import { CallControls } from '@/components/vc/call-controls'
import { ReconnectingOverlay } from '@/components/vc/reconnecting-overlay'
import { CallTimer } from '@/components/vc/call-timer'
import { Lobby } from '@/components/vc/lobby'
```

## Prop contracts

### VideoTile
```ts
{
  stream: MediaStream | null
  mirror?: boolean        // default false; flip horizontally (local cam)
  muted?: boolean         // default true
  objectCover?: boolean   // default true (object-cover vs object-contain)
  className?: string
  placeholder?: React.ReactNode  // shown when stream is null
  'aria-label'?: string
}
```
Renders a `<video>` (h-full w-full bg-black) OR a placeholder wrapper. Parent must size it. Applies `scale-x-[-1]` when mirror.

### CallControls
```ts
{
  micOn: boolean
  camOn: boolean
  onToggleMic: () => void
  onToggleCam: () => void
  onSwitchCamera: () => void
  onEnd: () => void
  canSwitchCamera?: boolean  // default true
  disabled?: boolean         // default false
}
```
Already self-contained pill (`bg-black/60 backdrop-blur-md rounded-full p-2 flex gap-3`). Place it in a flex-center container. End-call button is the larger red one on the right. Each toggle ON=translucent white, OFF=solid white/black. aria-label + aria-pressed set.

### ReconnectingOverlay
```ts
{
  visible: boolean
  attempt?: number
  reason?: string
}
```
Returns `null` when `!visible`. Otherwise `absolute inset-0 z-20 flex items-center justify-center pointer-events-none` — **parent must be `relative`**. Centered panel with spinner, "Reconnecting…", attempt-aware subtitle, optional reason. `role=status aria-live=polite`.

### CallTimer
```ts
{
  startedAt: number | null   // epoch ms
  running: boolean
}
```
Renders a `<span>` with formatted elapsed time. "0:00" when not running. 1s interval ticks only when `running && startedAt != null`.

### Lobby
No props. Self-contained landing screen using `useRouter` from `next/navigation`. Generates a 6-char room id (`genRoomId()`) and pushes `/?room=ID`. Also accepts a paste-join form.

## Styling notes

- Red accent only (`text-primary` / `bg-primary`). NO indigo/blue.
- Dark backgrounds via Tailwind tokens + oklch radial gradient in the lobby.
- Mobile-first responsive throughout.
- All icon buttons have `aria-label` and `aria-pressed` where it makes sense.
- Lobby input is uppercase + maxLength 12; the displayed value matches the room id format.

## Composition sketch (for the call-room orchestrator)

```tsx
<div className="relative h-screen w-full bg-black">
  {/* Remote (full-bleed) */}
  <VideoTile stream={remoteStream} objectCover aria-label="Remote peer video"
    placeholder={<EmptyPeerPlaceholder />} />

  {/* Local PiP */}
  <div className="absolute right-4 top-16 h-40 w-28 overflow-hidden rounded-2xl border border-white/15 shadow-xl sm:h-48 sm:w-32">
    <VideoTile stream={localStream} mirror muted aria-label="Your video" />
  </div>

  {/* Top status bar */}
  <div className="absolute left-0 right-0 top-0 flex items-center justify-between p-4 text-white">
    <button onClick={backToLobby} aria-label="Back to lobby"><ArrowLeft /></button>
    <span className="text-sm tabular-nums text-white/80"><CallTimer startedAt={callStartedAt} running={status === 'connected'} /></span>
  </div>

  {/* Bottom control pill */}
  <div className="absolute inset-x-0 bottom-6 flex justify-center">
    <CallControls micOn={micOn} camOn={camOn} ... onEnd={endCall} />
  </div>

  {/* Reconnect overlay (only when status === 'reconnecting') */}
  <ReconnectingOverlay visible={status === 'reconnecting'} attempt={reconnectAttempt} reason={statusDetail} />
</div>
```

## Did NOT touch

- No other files modified.
- Did not run lint/dev — orchestrator will lint after wiring the call-room orchestrator + page.tsx router.
