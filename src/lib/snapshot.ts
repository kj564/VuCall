'use client'

/**
 * Capture a still PNG snapshot of a playing <video> element and trigger a
 * download. Returns true on success, false if the video isn't ready/cross-
 * origin tainted (in which case toBlob throws a SecurityError).
 *
 * Used by the in-call "snapshot" button to save a frame of the remote video.
 */
export function captureVideoSnapshot(
  video: HTMLVideoElement | null,
  filenamePrefix = 'vucall-snapshot',
): boolean {
  if (!video) return false
  // videoWidth is 0 until the first frame is decoded — bail with a soft fail.
  if (!video.videoWidth || !video.videoHeight) return false

  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return false

  try {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
  } catch {
    // Most likely a SecurityError: the video frame is cross-origin tainted
    // (e.g. a remote peer's screen share from a cross-origin domain). Bail.
    return false
  }

  const url = canvas.toDataURL('image/png')
  const a = document.createElement('a')
  a.href = url
  a.download = `${filenamePrefix}-${Date.now()}.png`
  document.body.appendChild(a)
  a.click()
  a.remove()
  return true
}
