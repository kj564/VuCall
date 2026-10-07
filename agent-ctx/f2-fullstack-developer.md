# Task f2 — full-stack-developer (VC feature components)

## Scope
Built 5 Instagram-style presentational components on top of the existing VuCall WebRTC app. Worked ONLY on the assigned files. Did not touch any other file.

## Files created
1. `src/components/vc/quality-bars.tsx` — signal-strength indicator
2. `src/components/vc/chat-panel.tsx` — slide-in DM-style chat
3. `src/components/vc/reactions-overlay.tsx` — floating emoji reactions
4. `src/components/vc/filter-menu.tsx` — visual filter popover
5. `src/components/vc/minimized-pip.tsx` — draggable floating mini-call card

## Contracts honored
- Imported types from `@/lib/webrtc`: `ChatMessage`, `Reaction`, `NetworkQuality`.
- Imported `FILTER_PRESETS` from `@/lib/vc-store` (filter-menu only, as instructed).
- Imported `VideoTile` from `@/components/vc/video-tile` (minimized-pip).
- `cn` from `@/lib/utils`.
- framer-motion `motion` for chat-panel slide + reactions rise.
- lucide-react: Send, X, Check, Sparkles, Maximize2, PhoneOff.

## Prop contracts (for orchestrator consumption)
- `QualityBars`: `{ quality: NetworkQuality }` — pure display, `role=status` inline-flex.
- `ChatPanel`: `{ messages: ChatMessage[]; onSend: (text: string) => void; onClose: () => void; peerName?: string }` — `fixed inset-y-0 right-0`, includes exit animation (wrap in `<AnimatePresence>` if desired).
- `ReactionsOverlay`: `{ reactions: Reaction[]; onDone: (id: string) => void }` — `absolute inset-0 pointer-events-none`, parent must be relative.
- `FilterMenu`: `{ current: string; onSelect: (css: string) => void; onClose: () => void }` — `absolute bottom-full right-0`, parent must be relative.
- `MinimizedPip`: `{ localStream: MediaStream|null; remoteStream: MediaStream|null; quality: NetworkQuality; onExpand: () => void; onEnd: () => void }` — `position: fixed`, self-contained dragging.

## Design notes
- Dark, glassy (`bg-zinc-950/95 backdrop-blur-xl`, `bg-black/60`) Instagram-style surfaces.
- Red accent (`bg-primary` / `text-primary-foreground`) ONLY for: Send button, "me" chat bubbles, end-call button, active filter ring + check, avatar gradient. NO indigo/blue.
- Mobile-first responsive: chat panel `w-[88vw] sm:w-96`; PiP `w-44 sm:w-52`.
- Accessibility: aria-labels on icon buttons + textarea + dialog; `role=dialog`/`role=menu`/`role=status`/`role=menuitemradio`/`aria-checked`; keyboard: Enter sends, Shift+Enter newline.
- framer-motion used lightly: chat panel slide-in/out, reactions rising. PiP uses plain pointer events (transform state) since framer-motion's transform would clash with the drag-translate style.
- Reactions use a stable string hash of `reaction.id` for per-reaction randomization (xPct, drift, scale, stagger) — never re-randomizes on parent re-render. Removal scheduled via one-shot `setTimeout(2600ms)` → `onDone(id)`, cleared on unmount (no setState-in-render, no loop).
- PiP: position initialized off-screen + `ready=false`; `useLayoutEffect` measures the card on mount and places it bottom-right; `opacity: ready ? 1 : 0` avoids the initial flash at (0,0). Resize listener re-clamps. Drag clamps with `EDGE_GAP=16` on all sides.

## Status
- All 5 files written. Did NOT run `bun run lint` or `bun run dev` (per instructions). The orchestrator will lint after integration.
- Appended a new section to `worklog.md` starting with `---`.
