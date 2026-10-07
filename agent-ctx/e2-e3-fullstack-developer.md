# Task ID: e2-e3 — Instagram PreJoin + CallControls restyle

Agent: full-stack-developer
Scope: Restyle 2 VuCall components to match the real Instagram VC scrape (dark theme).

## Context read
- `worklog.md` sections: `ig-scrape-match` (real Instagram in-call aria-labels), `fix-no-video` (local media acquire-on-mount, VideoTile contract).
- `src/app/globals.css` `.dark` theme tokens (already match Instagram: --web-wash `#1a1a1a`, --wash `#3e4042`, --base-blue `#1877f2`, --base-cherry `#f3425f`, deemphasized `rgba(255,255,255,0.1)`).
- `src/components/vc/video-tile.tsx` — VideoTile prop contract (stream/mirror/muted/objectCover/placeholder/aria-label).
- `src/components/vc/call-controls.tsx` — prior version (bg-card based) to overwrite.
- `src/components/ui/switch.tsx` — shadcn Switch (onCheckedChange).

## Files written (ONLY these two)
1. `src/components/vc/pre-join.tsx` — CREATE
2. `src/components/vc/call-controls.tsx` — OVERWRITE

## Design decisions
- PreJoin: root `flex h-[100dvh] w-full flex-col items-center justify-center gap-5 bg-background p-6 text-center`.
  - Title `<h1 className="text-2xl font-bold text-foreground">VuCall</h1>`.
  - Local preview: `aspect-video w-full max-w-md overflow-hidden rounded-2xl bg-black` wrapping `<VideoTile stream={localStream} objectCover muted mirror aria-label="Your video" />` with a CSS border spinner placeholder (`size-8 animate-spin rounded-full border-2 border-white/20 border-t-white`) when no stream.
  - Join call: `w-full max-w-md rounded-xl bg-primary py-3 font-semibold text-primary-foreground` + `PhoneCall` icon.
  - Two toggle rows: `flex w-full max-w-md items-center justify-between rounded-xl bg-secondary px-4 py-3`; left = icon (Mic/MicOff or Video/VideoOff reflecting state) + label; right = shadcn `Switch` (checked=micro/cam on). Switch aria-label reflects the toggle action ("Mute microphone"/"Unmute microphone", "Turn off camera"/"Turn on camera").
  - Test speaker row: `flex w-full max-w-md items-center gap-3 rounded-xl bg-secondary px-4 py-3 text-foreground` + `Volume2` icon + "Test speaker".
  - Room id + copy link: `mt-2` block — "Kode ruangan: ROOMID" (mono) + small "Salin tautan"/"Tautan disalin" button with `Copy`/`Check` icon.
  - Icons imported from lucide-react: Mic, MicOff, Video, VideoOff, Volume2, Copy, Check, PhoneCall (all used).
  - `cn` used on copy-button classes (state-dependent text color).

- CallControls: root `role="toolbar"` `flex w-full max-w-[520px] items-center justify-between gap-2`.
  - Base media button: `size-12 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white transition hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40`. White lucide icons at `size-6`.
  - Mic: `Mic`/`MicOff`; when OFF → `bg-destructive text-white hover:bg-destructive hover:opacity-90` (red signals muted). aria-label "Mute microphone"/"Unmute microphone"; aria-pressed={!micOn}.
  - Cam: `Video`/`VideoOff`; when OFF → `bg-destructive text-white …`. aria-label "Turn off video"/"Turn on video"; aria-pressed={!camOn}.
  - Screen share: `ScreenShare`/`ScreenShareOff`; when sharing → `bg-primary text-primary-foreground …`. aria-label "Share your screen"/"Stop sharing"; aria-pressed={sharing}.
  - Fullscreen: `Maximize2`/`Minimize2`; when fullscreen → `bg-primary text-primary-foreground …`. aria-label "Enter full screen"/"Exit full screen"; aria-pressed={fullscreen}.
  - Switch camera (only if `canSwitchCamera !== false`): `SwitchCamera`, `className="sm:hidden"` (mobile-only). aria-label "Switch camera".
  - End call: `size-12 rounded-full bg-destructive text-white flex items-center justify-center hover:opacity-90`, `PhoneOff` size-6. aria-label "End call".
  - All toggles set `aria-pressed`. Colored states override the base `hover:bg-black/60` with a matching `hover:bg-<color>` so the color persists on hover.
  - Icons imported: Mic, MicOff, Video, VideoOff, ScreenShare, ScreenShareOff, Maximize2, Minimize2, SwitchCamera, PhoneOff (all used).

## Prop contracts (UNCHANGED / as specified)

### PreJoinProps (pre-join.tsx)
```ts
type PreJoinProps = {
  localStream: MediaStream | null
  micOn: boolean
  camOn: boolean
  roomId: string
  onToggleMic: () => void
  onToggleCam: () => void
  onTestSpeaker: () => void
  onJoin: () => void
  copied: boolean
  onCopyLink: () => void
}
```

### CallControlsProps (call-controls.tsx)
```ts
type CallControlsProps = {
  micOn: boolean
  camOn: boolean
  sharing: boolean
  fullscreen: boolean
  onToggleMic: () => void
  onToggleCam: () => void
  onToggleScreenShare: () => void
  onToggleFullscreen: () => void
  onSwitchCamera: () => void
  onEnd: () => void
  canSwitchCamera?: boolean
  disabled?: boolean
}
```

## Rules followed
- `'use client'` at top of both files.
- No `any`; no unused imports (every imported lucide icon is rendered).
- `cn` from `@/lib/utils`.
- Semantic tokens only (bg-background, bg-secondary, bg-primary, text-primary-foreground, text-foreground, text-muted-foreground, bg-destructive, text-destructive, border-border, ring-ring). Exception: `bg-black/40` / `bg-black` / `border-white/20` for the dark-glass control overlay + spinner (matches Instagram's video overlay).
- Accessibility: aria-labels on all interactive controls; aria-pressed on every toggle in CallControls; sr-only loading text on the PreJoin spinner placeholder.
- Did NOT touch any other files. Did NOT run lint/dev (per instructions).

## Status
- Both files written. Ready for the parent page (`src/app/page.tsx` / `call-room.tsx`) to import `<PreJoin>` and `<CallControls>`.
