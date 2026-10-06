# YouTube-like Website - Work Log

## Project Overview
Building a YouTube-like website with Next.js 16, TypeScript, Tailwind 4, shadcn/ui, Prisma (SQLite).

Key constraints:
- Only `/` page route is user-visible (use URL query params + Zustand for view switching)
- API routes under `/api/` are allowed
- Real sample MP4 videos from Google's gtv-videos-bucket for playable videos
- Picsum seeded images for thumbnails, DiceBear for channel avatars
- Dark theme by default with red (YouTube) accent
- Sticky footer required

Architecture:
- `src/lib/types.ts` - shared TypeScript types
- `src/lib/store.ts` - Zustand store (view state, search, sidebar)
- `src/lib/api.ts` - API client functions
- `src/lib/format.ts` - view count / time formatting helpers
- `src/components/youtube/*` - feature components (header, sidebar, views)
- `src/app/page.tsx` - single page that switches views based on URL params
- `src/app/api/*` - API routes

Views (switched via `?v=ID` watch, `?c=ID` channel, `?q=query` search, default home)

---
Task ID: 1
Agent: main (orchestrator)
Task: Foundation — Prisma schema, seed, shared types/store/api/format/nav, theme + layout

Work Log:
- Wrote prisma/schema.prisma with Channel, Video, Comment models (relations + indexes)
- Ran `bun run db:push` — DB in sync, Prisma client generated
- Wrote prisma/seed.ts with 8 channels + 24 videos (real sample MP4s from gtv-videos-bucket, picsum thumbnails, DiceBear avatars) + 114 comments; ran it successfully
- Created src/lib/types.ts (Channel, Video, Comment, VideoWithChannel, CATEGORIES)
- Created src/lib/format.ts (formatCompact/Views/Subscribers/Likes, formatTimeAgo)
- Created src/lib/store.ts (Zustand: sidebarOpen, searchInput, likedVideos, subscribedChannels, mobileNavOpen)
- Created src/lib/api.ts (fetchVideos/Video/Channel/Related, likeVideo, subscribeChannel, addComment)
- Created src/lib/nav.ts (useNav hook: goHome/Watch/Channel/Search/Category via `?v` `?c` `?q` `?cat`)
- Created src/components/youtube/channel-avatar.tsx (img with initials color fallback)
- API routes: /api/videos, /api/videos/[id], /api/videos/[id]/like, /api/channels/[id], /api/channels/[id]/subscribe, /api/comments
- Updated src/app/globals.css: YouTube red primary, dark-first theme, thin scrollbar + line-clamp utilities
- Updated src/app/layout.tsx: ThemeProvider (defaultTheme dark, no system), metadata for VuTube
- Lint passes clean

Stage Summary:
- DB seeded: 8 channels, 24 videos, 114 comments
- Single user route `/` with view switching via `?v`/`?c`/`?q`/`?cat` query params
- Contracts ready for frontend subagents: types @ '@/lib/types', store @ '@/lib/store', api @ '@/lib/api', format @ '@/lib/format', nav @ '@/lib/nav', ChannelAvatar @ '@/components/youtube/channel-avatar'

---
Task ID: 3-b
Agent: full-stack-developer (home + search views)
Task: Build the reusable VideoCard, VideoGrid, HomeView (category chips + grid), and SearchView (vertical result list) for VuTube

Work Log:
- Read worklog.md + existing contracts (types, api, format, nav, channel-avatar) to confirm exact import paths and signatures
- Wrote src/components/youtube/video-card.tsx — group-hover image scale, duration badge, separate clickable thumbnail/title (goWatch) and avatar/name (goChannel), Film icon onError fallback, BadgeCheck for verified channels
- Wrote src/components/youtube/video-grid.tsx — plain responsive grid (1 / sm:2 / lg:3 / xl:4) with gap-4 sm:gap-6
- Wrote src/components/youtube/home-view.tsx — reads ?cat (default All), useEffect fetch via fetchVideos, sticky category chips bar at top-14 with bg-background/95 backdrop-blur + scrollbar-thin, skeleton grid + empty + error states
- Wrote src/components/youtube/search-view.tsx — reads ?q, useEffect fetch, header "Results for …" with formatCompact count, responsive list (flex-col sm:flex-row rows in 1-col / lg:2-col grid), thumbnail capped at sm:max-w-360px, description line-clamp-3, skeletons + SearchX empty state
- Wrote agent-ctx/3-b-fullstack-developer.md work record

Stage Summary:
- 4 files created: video-card.tsx, video-grid.tsx, home-view.tsx, search-view.tsx
- Used useEffect + useState (NO TanStack Query — no QueryClientProvider in this app)
- Plain `<img loading=lazy>` with eslint-disable comment (picsum/dicebear not in next.config domains)
- Title wrapped in div role=button tabIndex=0 + onKeyDown (avoids invalid `<button><h3>` nesting)
- Channel avatar/name are sibling buttons (no nested-button issues, no stopPropagation needed)
- All icon-only / image buttons have aria-labels; category chips carry aria-pressed
- Did NOT run lint/dev (orchestrator will lint after integration)

---
Task ID: 3-c
Agent: full-stack-developer (watch + channel views)
Task: Build the WATCH and CHANNEL views (video player, info, comments, related list, watch-view, channel-view) — 7 client components.

Work Log:
- Read foundation contracts (types, api, format, store, nav, channel-avatar) — all confirmed present.
- video-player.tsx: responsive 16:9 container with HTML5 `<video>` (controls, poster, preload=metadata, playsInline). `key={videoUrl}` forces re-mount on navigation.
- video-info.tsx: title + channel row (avatar/name/verified/sub count) calling `goChannel`; like/dislike pill group with vertical Separator; subscribe button (Bell/BellRing, optimistic store + subscribeChannel + toast); description box (line-clamp-3 + expand, tag chips). Like math: `displayed = base + (likeState==='like' ? 1 : 0)`; on server confirm, `base = res.likes - (newState==='like' ? 1 : 0)` to keep displayed exactly matching the server across all toggle transitions.
- comments.tsx: header count, composer with Cancel/Comment buttons revealed on focus (Cmd/Ctrl+Enter submits), prepend new Comment locally + toast, per-comment vote toggle with ThumbsUp/Down + Reply.
- related-video-card.tsx: compact horizontal card (w-40 sm:w-44 thumbnail + duration badge, line-clamp-2 title, channel + views/time); full row clickable to `goWatch`, channel name nested button with stopPropagation → `goChannel`. Exports skeleton too.
- related-videos.tsx: useEffect fetch + skeleton/error/empty states; vertical list of RelatedVideoCard.
- watch-view.tsx: reads `?v=`, fetches fetchVideo, two-column flex on xl (main flex-1 min-w-0 + sidebar xl:w-[402px] xl:shrink-0), stacked on smaller screens. Loading skeleton + not-found state with `goHome`.
- channel-view.tsx: reads `?c=`, fetches fetchChannel. Bleeding banner (aspect 6/1 sm:7/1, no horizontal padding). Avatar 96px in `ring-4 ring-background` circle overlapping banner via `mt-[-48px]`. Name/verified/@handle/subs/video-count/description-with-expand/Subscribe button. Tabs (Videos default, About). Videos tab is a responsive grid of an **inline** ChannelVideoCard (no dependency on Task 3-a's video-card/video-grid). About tab: full description + stats grid (joined/subs/total videos/total views). Skeleton + not-found states.

Stage Summary:
- Files created (all `'use client'`):
  - src/components/youtube/video-player.tsx
  - src/components/youtube/video-info.tsx
  - src/components/youtube/comments.tsx
  - src/components/youtube/related-video-card.tsx
  - src/components/youtube/related-videos.tsx
  - src/components/youtube/watch-view.tsx
  - src/components/youtube/channel-view.tsx
- Channel grid card is inline so channel-view compiles standalone — does not import sibling agent's video-card/video-grid.
- All optimistic UI flows (like/dislike, subscribe, comment post) call the api client, update the Zustand store optimistically, revert + toast on failure.
- Plain `<img>` with eslint-disable + `loading="lazy"` for external images; no `any`, no unused imports. Mobile-first responsive throughout.

---
Task ID: 3-a
Agent: main (orchestrator) — layout shell
Task: AppShell, Header, Sidebar, Footer, ThemeToggle, page.tsx integration + lint/runtime fixes

Work Log:
- Created src/components/youtube/theme-toggle.tsx (next-themes Sun/Moon, mounted guard)
- Created src/components/youtube/header.tsx: hamburger (toggles sidebar on desktop / opens mobile sheet), red play logo + VuTube wordmark (goHome), desktop search form (rounded, centered) + mobile expandable search overlay, Create / Notifications / ThemeToggle / avatar DropdownMenu
- Created src/components/youtube/sidebar.tsx: expanded rail (w-60) + collapsed mini rail (w-72px) on desktop, mobile Sheet drawer. Nav sections: main (Home/Shorts/Subs), You (History/Playlists/Your videos/Watch later/Liked), Explore (Trending/Music/Gaming/Sports/Movies/Live/News/Podcasts), More (Settings/Help/Report). Category items call goCategory; Home highlights when not on watch/channel/search.
- Created src/components/youtube/footer.tsx (sticky mt-auto, slim link row + copyright)
- Created src/components/youtube/app-shell.tsx: min-h-screen flex-col; Header sticky top-0 h-14; Sidebar sticky top-14; main flex-1 min-h-[calc(100vh-3.5rem)] flex-col with content + Footer (mt-auto) -> sticky footer + natural push on overflow
- Created src/app/page.tsx: 'use client' Suspense-wrapped ViewRouter reading ?v/?c/?q -> WatchView/ChannelView/SearchView/HomeView, scroll-to-top on view change, skeleton HomeFallback
- Refactored home-view.tsx & search-view.tsx to a derived-state fetch pattern (key/status/data) to satisfy React 19 react-hooks/set-state-in-effect rule; removed unused eslint-disable img directives; footer.tsx simplified (no mounted state)
- Fixed runtime: lucide-react exports HelpCircle not Help — updated header.tsx & sidebar.tsx imports/usage. Verified all other lucide icons resolve.

Stage Summary:
- Layout shell + page integration complete. Lint clean. Dev server: GET / 200, /api/videos returns seeded data.
- All views wired via URL query params on the single `/` route.

---
Task ID: 4
Agent: main (orchestrator) — integration, lint fixes, Agent Browser self-verification
Task: Wire views in page.tsx, fix lint/runtime bugs, end-to-end verification

Work Log:
- Created src/app/page.tsx ViewRouter (Suspense-wrapped, reads ?v/?c/?q, scroll-to-top)
- Ran eslint: 3 errors (React-19 set-state-in-effect in home-view/search-view/footer) + 7 unused eslint-disable img directives. Auto-fixed unused directives via `eslint --fix`. Refactored home-view & search-view to derived-state fetch pattern (key/status/data). Simplified footer (removed mounted state). Lint now clean.
- Runtime bug: lucide-react has no `Help` export (it's `HelpCircle`) — fixed in header.tsx & sidebar.tsx; verified all other lucide icons resolve.
- Runtime bug: watch page showed "NaNB subscribers" because VideoWithChannel.channel omitted `subscribers`. Fixed by adding `subscribers` to the channel Pick in types.ts + both API selects (/api/videos + /api/videos/[id]).
- Agent Browser verification (all passed):
  * Home renders: header (logo/search/create/notifications/theme/avatar), sidebar (full nav), category chips, 24-video grid
  * Watch page: HTML5 video with real Google sample MP4 src + picsum poster (playable), title, channel+1.3M subs, like/dislike, share, save, expandable description, comments, related-videos sidebar
  * Subscribe toggle: optimistic state in Zustand store, persists across navigation (channel page still shows "Subscribed"), toast feedback
  * Like: registers (count delta too small to show at K precision — correct)
  * Comment post: appears in DOM + API returns it as first comment authored by "You"
  * Channel page: banner, avatar, name/@handle/subs, Videos/About tabs, subscribe persists
  * Search: /?q=pizza → 1 result, "Results for pizza" heading
  * Category filter: /?cat=Cooking → exactly 3 cooking videos
  * Theme toggle: dark ↔ light (html class switches)
  * Mobile (390x844): responsive layout, hamburger opens Sheet drawer
  * Sticky footer: short page (1 search result) → footerBottom=900=viewport (sticks); long page (24 videos mobile) → footer pushed to 7408px (natural). Both behaviors correct.
  * No console errors throughout.

Stage Summary:
- Production-ready YouTube-like site on single `/` route with 4 views (home/watch/channel/search), real playable videos, full interactivity (like/subscribe/comment/search/filter), dark+light themes, responsive + sticky footer. Lint clean, dev server healthy (GET / 200).

---
Task ID: vc-1
Agent: main (orchestrator) — video call foundation
Task: Pivot from YouTube to Instagram-style 1:1 WebRTC video call app. Signaling service + WebRTC lib + store.

Work Log:
- Honest note to user: bridging into real Instagram call infra is NOT possible (no public API). Building a standalone Instagram-style WebRTC app instead, with aggressive reconnection to solve the "connection lost" pain point.
- Installed socket.io-client in main project; created mini-services/signaling-service (separate bun project, socket.io on port 3003, path '/', resilient pings). Installed deps, started `bun --hot` in background (signaling.log). Verified reachable via gateway: curl localhost:81/socket.io?...&XTransformPort=3003 -> 200.
- Created src/lib/signaling.ts: Signaling class wrapping socket.io with auto-reconnect, room:join (ack youAreCaller), rejoin after reconnect, signal relay, peer-joined/left events.
- Created src/lib/webrtc.ts: CallManager with:
  * Perfect-negotiation pattern (polite/impolite) for safe (re)negotiation
  * ICE restart (pc.restartIce + createOffer iceRestart) on failed/disconnected
  * Buffered initial offer + candidates until peer present (caller side)
  * Bounded reconnect loop with exponential backoff (max 8 attempts)
  * Network online/offline listeners -> recovery instead of teardown
  * Media controls via track.enabled / replaceTrack (no renegotiation needed)
  * Graceful camera-denied fallback to audio-only
- Created src/lib/vc-store.ts: Zustand store (roomId, role, status, local/remote streams, micOn/camOn, reconnectAttempt, error, callStartedAt)

Stage Summary:
- Signaling service running on 3003. Core WebRTC resilience logic in place.
- Contracts ready for UI: Signaling @ '@/lib/signaling', CallManager (CallStatus) @ '@/lib/webrtc', useVCStore @ '@/lib/vc-store'.
- Next: presentational VC components (subagent) + call-room orchestrator (main) + page.tsx router.

---
Task ID: vc-3
Agent: full-stack-developer (VC presentational UI)
Task: Build the 5 presentational components for the Instagram-style 1:1 WebRTC call (video-tile, call-controls, reconnecting-overlay, call-timer, lobby).

Work Log:
- Read worklog.md (especially vc-1) and confirmed contracts: CallStatus @ '@/lib/webrtc', useVCStore @ '@/lib/vc-store', shadcn Button/Input @ '@/components/ui/*', cn @ '@/lib/utils', lucide-react icons (Mic/MicOff/Video/VideoOff/PhoneOff/SwitchCamera/Zap/Shield/Users/ArrowRight).
- Wrote src/components/vc/video-tile.tsx — 'use client', reusable <video> binding a MediaStream via srcObject + play().catch(()=>{}) in an effect keyed on stream; mirror via scale-x-[-1]; muted default true (with second effect keeping the muted attr in sync); object-cover/contain toggle; renders placeholder when stream null; h-full w-full bg-black.
- Wrote src/components/vc/call-controls.tsx — 'use client', Instagram-style floating pill (bg-black/60 backdrop-blur-md rounded-full p-2). Round size-12 toggle buttons (mic, cam) that flip between translucent white (ON) and solid white/black (OFF) for high contrast when muted. SwitchCamera button visibility gated by canSwitchCamera (default true). Larger size-14 red (bg-red-600) end-call button with PhoneOff. All buttons carry aria-label + aria-pressed; wrapped in role=toolbar.
- Wrote src/components/vc/reconnecting-overlay.tsx — 'use client'. Returns null when !visible. When visible, absolute inset-0 z-20 flex items-center justify-center pointer-events-none over a relative parent. Centered translucent panel (bg-black/70 backdrop-blur rounded-2xl px-6 py-5) with an animate-spin border-2 ring spinner, "Reconnecting…" title, attempt-aware subtitle ("Attempt N — keeping the call alive" or "Network unstable — recovering"), optional muted reason line. role=status aria-live=polite.
- Wrote src/components/vc/call-timer.tsx — 'use client'. 1s setInterval that only runs when running && startedAt != null. formatElapsed => M:SS (or H:MM:SS past 1h). Displays "0:00" when not running. Re-syncs `now` on each mount/dependency change so stale values never flash. Renders an accessible <span aria-label="Call duration">.
- Wrote src/components/vc/lobby.tsx — 'use client', self-contained, uses useRouter from next/navigation. Centered card on a dark radial-gradient background (oklch(0.22 0 0) -> oklch(0.12 0 0)). Red rounded-square logo with Video icon + "VuCall" wordmark (Call in text-primary). Subtitle in Indonesian. Primary "Mulai panggilan" button (genRoomId = 6-char uppercase alphanumerics) -> router.push(`/?room=${id}`). "atau" divider. Join form (Input + "Gabung" Button) -> router.push(`/?room=${trimmed}`) on submit; disabled when empty; uppercase input + maxLength 12. 3-item features list (Zap/Shield/Users) with circle icons. Footer note about sharing the room link. Fully responsive (max-w-md, py-10).
- Did NOT run lint/dev (orchestrator will lint after integration).
- Wrote agent-ctx/vc-3-fullstack-developer.md work record.

Stage Summary:
- 5 files created (all 'use client', no `any`, no unused imports, accessible):
  - src/components/vc/video-tile.tsx
  - src/components/vc/call-controls.tsx
  - src/components/vc/reconnecting-overlay.tsx
  - src/components/vc/call-timer.tsx
  - src/components/vc/lobby.tsx
- All presentational components are prop-driven (no store coupling) so the call-room orchestrator can compose them freely; the lobby is the only one that owns navigation (useRouter).
- Brand: red accent (text-primary / bg-primary), NO indigo/blue. Dark gradient backgrounds. Mobile-first.
- Prop contracts (for orchestrator consumption):
  * VideoTile: { stream, mirror?, muted?=true, objectCover?=true, className?, placeholder?, 'aria-label'? }
  * CallControls: { micOn, camOn, onToggleMic, onToggleCam, onSwitchCamera, onEnd, canSwitchCamera?=true, disabled?=false }
  * ReconnectingOverlay: { visible, attempt?, reason? }  (absolute inset-0; parent must be relative)
  * CallTimer: { startedAt, running }  (renders <span>)
  * Lobby: no props (reads nothing, owns useRouter)

---
Task ID: vc-4
Agent: main (orchestrator) — VC integration, debugging, self-verification
Task: Wire call-room orchestrator + page.tsx; debug WebRTC negotiation; Agent Browser self-verification

Work Log:
- Built src/components/vc/call-room.tsx: orchestrates Signaling + CallManager + store; onConnect→joinRoom→create manager (polite=!caller)→start()→drain pending signals; buffers signals before manager ready; renders remote full-bleed + local PiP + controls + reconnecting overlay + share-link card (waiting) + failed/ended screens.
- Built src/app/page.tsx: Suspense-wrapped VCRouter (?room= → CallRoom, else Lobby). Updated layout metadata to "VuCall".
- Added synthetic-media fallback in CallManager (canvas video + silent audio) so calls work even with no camera (headless demo + denied-permission graceful degradation).
- CRITICAL BUGS FOUND & FIXED via two-session Agent Browser P2P test:
  1. handleSignal silently dropped the offer when this.pc was null (offer arrived during getUserMedia/setup) → buffered signals inside CallManager + drain after buildPeerConnection.
  2. ICE-restart glare: manual restartConnection + onnegotiationneeded both emitted offers → added restartInProgress guard to suppress the auto-offer during a manual ICE restart.
  3. offline listener prematurely flipped status to 'reconnecting' even when ICE stayed connected → made ICE state the source of truth; online listener restores 'connected' if ICE never dropped, only restarts when actually needed.
  4. Call timer reset on every 'connected' transition → made startCallTimer idempotent (only sets if null).
- Trimmed verbose per-signal debug logs for production cleanliness; kept ice-state/ontrack/restart/drain diagnostics.

Agent Browser self-verification (all passed):
- Lobby renders (logo, "Mulai panggilan", join input, features list) — via gateway port 81 (localhost:3000 bypasses Caddy so XTransformPort forwarding needs the gateway).
- Signaling connects through gateway (?XTransformPort=3003); server logs both peers joining the same room.
- Two-session P2P WebRTC connection ESTABLISHED: ICE state `connected` on both, remote audio+video tracks flowing both ways (2 videos each with srcObject), call timer counting in sync.
- Mute toggle works (button label flips Mute↔Unmute).
- RECONNECTION: simulated `set offline on` (4s) then `set offline off` — the call SURVIVED with no interruption. Timer continued 0:08→0:20 across the network blip; never dropped to "Reconnecting" (ICE stayed connected through the brief outage). This is the core win vs Instagram's "connection lost" auto-drop.
- End call: A returns to lobby; B shows "Panggilan berakhir — Teman Anda telah meninggalkan panggilan" with back-to-lobby button (peer-leave notification via room:peer-left).
- No console errors throughout.

Stage Summary:
- Production-ready 1:1 WebRTC video call (Instagram-style UI) with aggressive reconnection that survives network blips instead of dropping.
- Single `/` route; views switched via ?room=. Signaling mini-service on port 3003 via gateway.
- Honest limitation: cannot bridge into real Instagram (no public API) — both peers open the shared web link. Longer network drops (>socket ping timeout) would need userId-based room rejoin + TURN for restrictive NATs (documented in code comments).
