'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

// Navigation helper that drives the single `/` route via query params.
// v   -> watch video
// c   -> channel page
// q   -> search results
// cat -> home category filter
export function useNav() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const goHome = useCallback(() => {
    router.push('/')
  }, [router])

  const goWatch = useCallback(
    (id: string) => {
      router.push(`/?v=${encodeURIComponent(id)}`)
    },
    [router],
  )

  const goChannel = useCallback(
    (id: string) => {
      router.push(`/?c=${encodeURIComponent(id)}`)
    },
    [router],
  )

  const goSearch = useCallback(
    (q: string) => {
      const trimmed = q.trim()
      if (!trimmed) {
        router.push('/')
        return
      }
      router.push(`/?q=${encodeURIComponent(trimmed)}`)
    },
    [router],
  )

  const goCategory = useCallback(
    (category: string) => {
      const params = new URLSearchParams()
      if (category && category !== 'All') {
        params.set('cat', category)
      }
      const qs = params.toString()
      router.push(qs ? `/?${qs}` : '/')
    },
    [router],
  )

  return { goHome, goWatch, goChannel, goSearch, goCategory }
}
