import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// POST /api/videos/[id]/like  body: { state: 'like' | 'dislike' | null }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const state: 'like' | 'dislike' | null = body.state ?? null

  const video = await db.video.findUnique({ where: { id } })
  if (!video) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 })
  }

  // For simplicity we just apply deltas directly based on the requested state.
  // A real app would track per-user state; here we keep counts realistic-ish.
  const data: { likes?: number; dislikes?: number } = {}
  if (state === 'like') data.likes = video.likes + 1
  if (state === 'dislike') data.dislikes = video.dislikes + 1

  if (Object.keys(data).length) {
    await db.video.update({ where: { id }, data })
  }

  const updated = await db.video.findUnique({
    where: { id },
    select: { likes: true, dislikes: true },
  })
  return NextResponse.json(updated)
}
