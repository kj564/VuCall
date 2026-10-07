import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/channels/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const channel = await db.channel.findUnique({
    where: { id },
    include: {
      videos: { orderBy: { publishedAt: 'desc' } },
    },
  })
  if (!channel) {
    return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
  }
  const serialized = {
    ...channel,
    createdAt:
      channel.createdAt instanceof Date ? channel.createdAt.toISOString() : channel.createdAt,
    videos: channel.videos.map((v) => ({
      ...v,
      publishedAt:
        v.publishedAt instanceof Date ? v.publishedAt.toISOString() : v.publishedAt,
    })),
  }
  return NextResponse.json(serialized)
}
