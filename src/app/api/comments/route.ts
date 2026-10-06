import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// POST /api/comments  body: { videoId, text }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { videoId, text } = body as { videoId?: string; text?: string }

  if (!videoId || !text || typeof text !== 'string' || !text.trim()) {
    return NextResponse.json(
      { error: 'videoId and text are required' },
      { status: 400 },
    )
  }

  const video = await db.video.findUnique({ where: { id: videoId } })
  if (!video) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 })
  }

  // Simulate the current user
  const authorName = 'You'
  const authorAvatar =
    'https://api.dicebear.com/7.x/personas/svg?seed=you'

  const comment = await db.comment.create({
    data: {
      videoId,
      authorName,
      authorAvatar,
      text: text.trim().slice(0, 2000),
      likes: 0,
    },
  })

  return NextResponse.json({
    ...comment,
    createdAt:
      comment.createdAt instanceof Date ? comment.createdAt.toISOString() : comment.createdAt,
  })
}
