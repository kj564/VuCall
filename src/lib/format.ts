// Formatting helpers for the YouTube-like app

export function formatCompact(n: number): string {
  if (n < 1000) return String(n)
  if (n < 1_000_000) {
    const v = n / 1000
    return `${v >= 100 ? Math.round(v) : trim(v)}K`
  }
  if (n < 1_000_000_000) {
    const v = n / 1_000_000
    return `${v >= 100 ? Math.round(v) : trim(v)}M`
  }
  const v = n / 1_000_000_000
  return `${trim(v)}B`
}

function trim(v: number): string {
  // one decimal, drop trailing .0
  const s = v.toFixed(1)
  return s.endsWith('.0') ? s.slice(0, -2) : s
}

export function formatViews(n: number): string {
  const c = formatCompact(n)
  return `${c} view${n === 1 ? '' : 's'}`
}

export function formatSubscribers(n: number): string {
  const c = formatCompact(n)
  return `${c} subscriber${n === 1 ? '' : 's'}`
}

export function formatLikes(n: number): string {
  return formatCompact(n)
}

export function formatTimeAgo(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = Date.now()
  const diff = Math.max(0, now - d.getTime())
  const sec = Math.floor(diff / 1000)
  const min = Math.floor(sec / 60)
  const hr = Math.floor(min / 60)
  const day = Math.floor(hr / 24)
  const week = Math.floor(day / 7)
  const month = Math.floor(day / 30)
  const year = Math.floor(day / 365)

  if (sec < 60) return 'just now'
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`
  if (day < 7) return `${day} day${day === 1 ? '' : 's'} ago`
  if (week < 5) return `${week} week${week === 1 ? '' : 's'} ago`
  if (month < 12) return `${month} month${month === 1 ? '' : 's'} ago`
  return `${year} year${year === 1 ? '' : 's'} ago`
}

export function formatCommentTime(date: Date | string): string {
  return formatTimeAgo(date)
}
