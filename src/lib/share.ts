'use client'

/**
 * Share a VuCall room link to Instagram — the only *real, legitimate*
 * Instagram integration available to a third-party web app.
 *
 * - On mobile: uses the Web Share API. The native share sheet includes
 *   Instagram (DM / Story), so the user can send the room link straight
 *   into an Instagram conversation.
 * - On desktop (no Web Share): copies the link to the clipboard and opens
 *   instagram.com so the user can paste it into a DM.
 *
 * What this is NOT: it does not (and cannot) start or receive an Instagram
 * video call. Instagram offers no public API/embed for that — only their own
 * app can. So the friend still opens the VuCall link in their browser; this
 * integration just makes the link reach them through Instagram.
 */
export type ShareResult = 'shared' | 'copied' | 'cancelled'

export async function shareToInstagram(
  url: string,
  label = 'VuCall',
): Promise<ShareResult> {
  if (typeof navigator === 'undefined') return 'cancelled'

  // 1) Web Share API (best path on mobile — Instagram appears in the sheet).
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title: label,
        text: `Ayo video call di ${label}:`,
        url,
      })
      return 'shared'
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        return 'cancelled'
      }
      // fall through to the clipboard fallback
    }
  }

  // 2) Fallback: copy + open Instagram so the user can paste into a DM.
  try {
    await navigator.clipboard?.writeText(url)
  } catch {
    /* clipboard may be blocked; still open Instagram below */
  }
  if (typeof window !== 'undefined') {
    window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer')
  }
  return 'copied'
}
