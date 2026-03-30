import type { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { enrichDeviceInfoWithSignature, inspectAnalyticsTraffic } from '@/lib/analytics-traffic'
import { prisma } from '@/lib/prisma'
import { getGeoInfo } from '@/lib/geo'

// POST /api/pageview
// body: { sessionId, path, action: 'enter' | 'leave', duration? }
export async function POST(req: NextRequest) {
  try {
    const { sessionId, visitorId, articleId, path, action, duration, referrer, deviceInfo } = await req.json()
    if (!sessionId || !path || !action) return NextResponse.json({ ok: false })

    const userAgent = req.headers.get('user-agent') || ''
    const safeDeviceInfo = enrichDeviceInfoWithSignature(userAgent, deviceInfo)
    const traffic = await inspectAnalyticsTraffic(req, { deviceInfo: safeDeviceInfo })

    if (traffic.skipped) {
      return NextResponse.json({ ok: true, skipped: traffic.reason })
    }

    const ip = traffic.ipAddress || '127.0.0.1'
    const ua = traffic.userAgent

    if (action === 'enter') {
      const duplicateWindowStart = new Date(Date.now() - 12 * 1000)
      const recent = await prisma.pageView.findFirst({
        where: {
          sessionId,
          path,
          articleId: typeof articleId === 'string' ? articleId : null,
          enteredAt: { gte: duplicateWindowStart },
        },
        select: { id: true },
      })

      if (recent) {
        return NextResponse.json({ ok: true, deduped: true })
      }

      const geo = await getGeoInfo(ip)
      await prisma.pageView.create({
        data: {
          sessionId,
          visitorId: typeof visitorId === 'string' ? visitorId : null,
          articleId: typeof articleId === 'string' ? articleId : null,
          ipAddress: ip,
          ipRegion:  geo?.region || null,
          ipCity:    geo?.city   || null,
          path,
          referrer: typeof referrer === 'string' ? referrer.slice(0, 500) : null,
          userAgent: ua.slice(0, 200),
          ...(safeDeviceInfo ? { deviceInfo: safeDeviceInfo as Prisma.InputJsonValue } : {}),
        },
      })
    }

    if (action === 'leave' && typeof duration === 'number' && duration > 0) {
      // 更新最近一条同 sessionId + path 的记录的停留时长
      const record = await prisma.pageView.findFirst({
        where: {
          sessionId,
          path,
          articleId: typeof articleId === 'string' ? articleId : null,
        },
        orderBy: { enteredAt: 'desc' },
        select: {
          id: true,
          duration: true,
          deviceInfo: true,
          userAgent: true,
        },
      })
      if (record) {
        const devicePayload = safeDeviceInfo ?? enrichDeviceInfoWithSignature(record.userAgent, deviceInfo)
        await prisma.pageView.update({
          where: { id: record.id },
          data: {
            duration: Math.max(record.duration ?? 0, Math.min(duration, 86400)),
            ...(devicePayload && !record.deviceInfo
              ? { deviceInfo: devicePayload as Prisma.InputJsonValue }
              : {}),
          }, // 最多记录 24h
        })
      }
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
