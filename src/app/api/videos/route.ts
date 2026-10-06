import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { VideoWithChannel } from '@/lib/types'

export const dynamic = 'force-dynamic'

// GET /api/videos?category=&q=&channelId=&relatedTo=&limit=
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category') || undefined
  const q = searchParams.get('q') || undefined
  const channelId = searchParams.get('channelId') || undefined
  const relatedTo = searchParams.get('relatedTo') || undefined
  const limitParam = searchParams.get('limit')
  const limit = limitParam ? Math.min(60, Math.max(1, parseInt(limitParam, 10) || 24)) : 60

  const channelSelect = {
    select: { id: true, name: true, handle: true, avatar: true, verified: true, subscribers: true },
  }

  // Related: pick videos other than the source, prefer same category then fill.
  if (relatedTo) {
    const source = await db.video.findUnique({ where: { id: relatedTo } })
    let related: VideoWithChannel[]
    if (source) {
      const sameCat = await db.video.findMany({
        where: { id: { not: source.id }, category: source.category },
        include: { channel: channelSelect },
        take: limit,
        orderBy: { views: 'desc' },
      })
      const others = await db.video.findMany({
        where: { id: { not: source.id } },
        include: { channel: channelSelect },
        take: limit,
        orderBy: { views: 'desc' },
      })
      const seen = new Set(sameCat.map((v) => v.id))
      related = [...sameCat, ...others.filter((v) => !seen.has(v.id))].slice(0, limit) as unknown as VideoWithChannel[]
    } else {
      related = await db.video.findMany({
        include: { channel: channelSelect },
        take: limit,
        orderBy: { views: 'desc' },
      }) as unknown as VideoWithChannel[]
    }
    return NextResponse.json(serializeVideos(related))
  }

  // Build where clause
  const where: Record<string, unknown> = {}
  if (channelId) where.channelId = channelId
  if (category && category !== 'All') {
    if (category !== 'Recently uploaded' && category !== 'Watched' && category !== 'Live' && category !== 'Podcasts' && category !== 'News') {
      where.category = category
    }
  }

  // Search query: match title / tags / description
  if (q && q.trim()) {
    where.OR = [
      { title: { contains: q } },
      { tags: { contains: q } },
      { description: { contains: q } },
    ]
  }

  const orderBy: Record<string, 'desc' | 'asc'> =
    category === 'Recently uploaded' ? { publishedAt: 'desc' } : { views: 'desc' }

  let result = (await db.video.findMany({
    where,
    include: { channel: channelSelect },
    orderBy,
    take: limit,
  })) as unknown as VideoWithChannel[]

  // If searching, also match by channel name and merge
  if (q && q.trim()) {
    const channelMatches = await db.channel.findMany({
      where: { name: { contains: q } },
      select: { id: true },
    })
    if (channelMatches.length) {
      const extra = (await db.video.findMany({
        where: { channelId: { in: channelMatches.map((c) => c.id) } },
        include: { channel: channelSelect },
        take: limit,
        orderBy: { views: 'desc' },
      })) as unknown as VideoWithChannel[]
      const seen = new Set(result.map((v) => v.id))
      result = [
        ...result,
        ...extra.filter((v) => {
          if (seen.has(v.id)) return false
          seen.add(v.id)
          return true
        }),
      ].slice(0, limit)
    }
  }

  if (category === 'Watched') {
    result = result.slice(0, Math.min(8, result.length))
  }

  return NextResponse.json(serializeVideos(result))
}

function serializeVideos(videos: VideoWithChannel[]): VideoWithChannel[] {
  return videos.map((v) => ({
    ...v,
    publishedAt: v.publishedAt instanceof Date ? v.publishedAt.toISOString() : v.publishedAt,
  }))
}
