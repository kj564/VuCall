# Task 3-b — full-stack-developer (home + search views)

## Task
Build the HOME and SEARCH views for the VuTube (YouTube-like) Next.js 16 app: the reusable `VideoCard`, a `VideoGrid` wrapper, the `HomeView` (category chips + grid), and the `SearchView` (vertical result list).

## Files Created
- `src/components/youtube/video-card.tsx` — single video card with clickable thumbnail/title (goWatch) and clickable avatar/name (goChannel). Includes `<img loading="lazy">` with `onError` Film-icon fallback, duration badge, verified BadgeCheck.
- `src/components/youtube/video-grid.tsx` — pure server-friendly grid wrapper: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` with `gap-4 sm:gap-6`.
- `src/components/youtube/home-view.tsx` — reads `?cat` (default `All`), fetches via `fetchVideos({category})` in `useEffect`, sticky category chips bar at `top-14`, skeleton grid while loading, empty + error states.
- `src/components/youtube/search-view.tsx` — reads `?q`, fetches via `fetchVideos({q})`, single-column responsive list (2-col on lg) of larger rows (thumbnail max-w-360 + details with description line-clamp-3), skeletons + empty state with SearchX icon.

## Contracts Used (from Task 1)
- `@/lib/types` — `VideoWithChannel`, `CATEGORIES`
- `@/lib/api` — `fetchVideos`
- `@/lib/format` — `formatViews`, `formatCompact`, `formatTimeAgo`
- `@/lib/nav` — `useNav` (`goWatch`, `goChannel`, `goCategory`)
- `@/components/youtube/channel-avatar` — `ChannelAvatar`
- `@/components/ui/skeleton` — shadcn Skeleton

## Key Decisions
- Used `useEffect` + `useState` (NOT TanStack Query) since the orchestrator confirmed there is no `QueryClientProvider`.
- `'use client'` only where hooks/event handlers are used (video-card, home-view, search-view). `video-grid` is a plain server-friendly component.
- Used plain `<img>` with `// eslint-disable-next-line @next/next/no-img-element` per the contract (picsum/dicebear not in `next.config` domains).
- Used a `div role="button" tabIndex={0}` + onKeyDown wrapper around the title heading (avoids the invalid `<button><h3>` nesting).
- Separated the channel avatar/name into their own `<button>` elements (siblings, not nested) so `e.stopPropagation()` is unnecessary.
- Added `aria-pressed` on category chips, `aria-label` on icon-only / image buttons.
- Sticky category bar at `top-14` (header is `h-14` = 56px) with `bg-background/95 backdrop-blur` and the `scrollbar-thin` utility class from globals.css.
- Search-row layout: `flex-col sm:flex-row` (stacked on mobile, side-by-side on sm+); grid is 1-col on mobile, 2-col on `lg`. Thumbnail capped at `sm:max-w-[360px]` per spec.
- Loading states use shadcn `Skeleton` (not custom divs).
- Added light error states (network failures) even though the spec didn't require them, for robustness.
- `fetchVideos` calls omit `category`/`q` for the `All` / empty-query cases to keep requests clean.

## Not Touched
- Did not modify `page.tsx`, `nav.ts`, `api.ts`, `types.ts`, `format.ts`, `channel-avatar.tsx`, `globals.css`, or any other existing file.

## No Lint / Dev Run
Per orchestrator instructions, did NOT run `bun run lint` or `bun run dev`. Wrote clean, lint-friendly code (no `any`, no unused imports).
