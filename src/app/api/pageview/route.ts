import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getGeoInfo } from '@/lib/geo'

function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') || '127.0.0.1'
}

// POST /api/pageview
// body: { sessionId, path, action: 'enter' | 'leave', duration? }
export async function POST(req: NextRequest) {
  try {
    const { sessionId, path, action, duration } = await req.json()
    if (!sessionId || !path || !action) return NextResponse.json({ ok: false })

    const ip = getClientIP(req)
    const ua = req.headers.get('user-agent') || ''

    if (action === 'enter') {
      const geo = await getGeoInfo(ip)
      await prisma.pageView.create({
        data: {
          sessionId,
          ipAddress: ip,
          ipRegion:  geo?.region || null,
          ipCity:    geo?.city   || null,
          path,
          userAgent: ua.slice(0, 200),
        },
      })
    }

    if (action === 'leave' && typeof duration === 'number' && duration > 0) {
      // 更新最近一条同 sessionId + path 的记录的停留时长
      const record = await prisma.pageView.findFirst({
        where: { sessionId, path, duration: null },
        orderBy: { enteredAt: 'desc' },
      })
      if (record) {
        await prisma.pageView.update({
          where: { id: record.id },
          data: { duration: Math.min(duration, 86400) }, // 最多记录 24h
        })
      }
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
