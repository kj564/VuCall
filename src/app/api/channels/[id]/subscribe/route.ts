import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// POST /api/channels/[id]/subscribe  body: { subscribe: boolean }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const subscribe: boolean = !!body.subscribe

  const channel = await db.channel.findUnique({ where: { id } })
  if (!channel) {
    return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
  }

  const updated = await db.channel.update({
    where: { id },
    data: { subscribers: channel.subscribers + (subscribe ? 1 : -1) },
    select: { subscribers: true },
  })

  return NextResponse.json({
    subscribers: updated.subscribers,
    subscribed: subscribe,
  })
}
