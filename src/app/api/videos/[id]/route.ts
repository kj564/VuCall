import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/videos/[id]?include=comments
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const includeComments = searchParams.get('include') === 'comments'

  const video = await db.video.findUnique({
    where: { id },
    include: {
      channel: {
        select: { id: true, name: true, handle: true, avatar: true, verified: true, subscribers: true },
      },
      comments: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!video) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 })
  }

  // Increment views once per fetch (lightweight "play" proxy)
  await db.video.update({
    where: { id },
    data: { views: { increment: 1 } },
  })

  const serialized = {
    ...video,
    publishedAt:
      video.publishedAt instanceof Date ? video.publishedAt.toISOString() : video.publishedAt,
    comments: includeComments
      ? video.comments.map((c) => ({
          ...c,
          createdAt:
            c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
        }))
      : [],
  }

  return NextResponse.json({ video: serialized, comments: serialized.comments })
}
