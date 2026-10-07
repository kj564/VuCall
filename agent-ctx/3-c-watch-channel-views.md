# Task 3-c — Watch + Channel views

Agent: full-stack-developer (watch + channel views)
Status: DONE

## Files created

1. `src/components/youtube/video-player.tsx`
   - Responsive 16:9 HTML5 `<video>` player. Container is
     `aspect-video w-full bg-black rounded-xl overflow-hidden`. Not sticky
     per spec. Uses `key={video.videoUrl}` so navigating between videos
     re-mounts the element and restarts playback.

2. `src/components/youtube/video-info.tsx`
   - Title, channel row (ChannelAvatar size 40 + name + verified BadgeCheck
     + subscriber count; clicking the channel row calls `goChannel`).
   - Like/Dislike pill group: `bg-secondary rounded-full` container with
     a vertical `Separator` between ThumbsUp and ThumbsDown. Active state
     highlighted in `text-primary` and `fill="currentColor"`.
   - Like math: `displayedLikes = baseLikes + (likeState === 'like' ? 1 : 0)`.
     On click, optimistic `setLiked` then `likeVideo` — on success we
     re-sync `baseLikes = res.likes - (newState==='like' ? 1 : 0)` so the
     displayed count exactly matches the server's authoritative total.
     Reverts the store on failure.
   - Subscribe button: `bg-foreground text-background` when not subscribed
     with Bell icon; outline `border-border bg-transparent` when
     subscribed with BellRing. Optimistic `toggleSubscribed` then
     `subscribeChannel` API; toast on success / revert + toast on failure.
   - Description box: `bg-secondary/60 rounded-xl p-3`, bold
     `formatViews(views) · formatTimeAgo(publishedAt)` line, line-clamp-3
     description with expand toggle, tag chips (`#tag`) when `video.tags`
     is non-empty.

3. `src/components/youtube/comments.tsx`
   - Header: `{formatCompact(n)} Comment(s)`.
   - Composer: ChannelAvatar "You" + Textarea. On focus, reveals
     Cancel/Comment buttons. Cmd/Ctrl+Enter submits. Posts via
     `addComment`, prepends the returned Comment to a local list (kept in
     sync with props via `useEffect`), clears input, fires
     "Comment posted" toast.
   - Comment list rows: ChannelAvatar size 40 (src=authorAvatar,
     name=authorName), `@handle` + `formatCommentTime`, text,
     ThumbsUp/ThumbsDown/Reply row. Per-comment local vote state.
   - Inline skeleton shown while posting.

4. `src/components/youtube/related-video-card.tsx`
   - Compact horizontal card. Thumbnail (`w-40 sm:w-44 aspect-video rounded-lg`)
     with lazy `<img>` and a duration badge; title (line-clamp-2),
     channel name + verified BadgeCheck, `formatViews · formatTimeAgo`.
   - Whole row clickable → `goWatch(video.id)` (Enter/Space keyboard
     friendly). Channel name is a nested button that `stopPropagation`s
     and calls `goChannel`.
   - Exports `RelatedVideoCardSkeleton` for the loading state.

5. `src/components/youtube/related-videos.tsx`
   - `useEffect([videoId])` fetch via `fetchRelatedVideos`. Renders a
     vertical `flex flex-col gap-3` list of `RelatedVideoCard`.
     6-row skeleton on loading; muted error / empty states.

6. `src/components/youtube/watch-view.tsx`
   - Reads `useSearchParams().get('v')`. `useEffect([videoId])` fetches
     `fetchVideo`. Layout: `flex flex-col xl:flex-row gap-6 px-4 sm:px-6
     py-4`. Main column `flex-1 min-w-0` holds VideoPlayer → VideoInfo
     → Separator → Comments. Sidebar `xl:w-[402px] xl:shrink-0` holds
     `RelatedVideos`. On small screens everything stacks.
   - Loading: full skeleton (player + info + sidebar rows).
   - Not-found state: centered message + "Back to home" button via
     `goHome`.

7. `src/components/youtube/channel-view.tsx`
   - Reads `useSearchParams().get('c')`. `useEffect([channelId])` fetches
     `fetchChannel`.
   - Banner `aspect-[6/1] sm:aspect-[7/1] w-full rounded-2xl` with lazy
     `<img>` (no horizontal padding so it bleeds).
   - Header row shifted up `mt-[-48px]` so the 96px ChannelAvatar
     (wrapped in a `ring-4 ring-background` circle) overlaps the banner.
     Channel name (xl/2xl bold) + verified BadgeCheck, `@handle`,
     `{subscribers} · {N} videos`, description (line-clamp-2 with
     "...more"/"Show less" toggle), and Subscribe button on the right
     (same logic as video-info subscribe).
   - `Tabs` with "Videos" (default) and "About". Videos tab renders a
     responsive `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
     xl:grid-cols-4` of an **inline** `ChannelVideoCard` (thumbnail +
     duration badge + title + views/time). Built inline rather than
     importing `@/components/youtube/video-card` so this file compiles
     standalone — no dependency on Task 3-a's parallel work.
   - About tab: full description + 2-col stats grid (Joined,
     Subscribers, Total videos, Total views).
   - Loading skeleton. Not-found state with `goHome` button.

## Decisions worth flagging

- Channel grid card is **inline** in channel-view.tsx — does not import
  the parallel agent's `VideoCard`/`VideoGrid`. If Task 3-a ships those,
  they remain independently usable; this just avoids any build-time
  coupling between the two work streams.
- Player is intentionally NOT sticky (spec allowed either; chose simpler).
- Like count uses the spec's exact formula
  `displayed = base + (likeState==='like' ? 1 : 0)`. After server confirms,
  I subtract the local delta off the response so the displayed total
  stays in sync with the authoritative server count across all toggle
  transitions (like→null, like→dislike, dislike→null, etc.).
- Used `useUIStore((s) => s.likedVideos)` selector form so each component
  only re-renders when its slice changes.
- All client components tagged `'use client'` at the top.
- Plain `<img>` for external images (picsum/dicebear) with the
  `eslint-disable-next-line @next/next/no-img-element` comment and
  `loading="lazy"`.
- No `any` types; no unused imports.
- All interactive elements have hover transitions and accessible labels
  / roles where appropriate (e.g., related cards are `role="button"`
  with `tabIndex=0` and Enter/Space handlers).
