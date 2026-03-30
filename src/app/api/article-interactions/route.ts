import { NextRequest, NextResponse } from 'next/server'
import { inspectAnalyticsTraffic } from '@/lib/analytics-traffic'
import {
  getArticleEngagementSummary,
  recordArticleQualifiedView,
  recordArticleShare,
  recordArticleViewEnter,
  recordArticleViewLeave,
  toggleArticleLike,
} from '@/lib/article-engagement'

export async function GET(req: NextRequest) {
  const articleId = req.nextUrl.searchParams.get('articleId')
  const visitorId = req.nextUrl.searchParams.get('visitorId')

  if (!articleId) {
    return NextResponse.json({ error: '缺少 articleId' }, { status: 400 })
  }

  const summary = await getArticleEngagementSummary(articleId, visitorId)
  return NextResponse.json(summary)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: '请求数据无效' }, { status: 400 })
  }

  const articleId = typeof body.articleId === 'string' ? body.articleId : ''
  const visitorId = typeof body.visitorId === 'string' ? body.visitorId : ''
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : null
  const path = typeof body.path === 'string' ? body.path : null
  const referrer = typeof body.referrer === 'string' ? body.referrer : null
  const deviceInfo = typeof body.deviceInfo === 'object' && body.deviceInfo ? body.deviceInfo : null

  if (!articleId || !visitorId) {
    return NextResponse.json({ error: '缺少 articleId 或 visitorId' }, { status: 400 })
  }

  const action = typeof body.action === 'string' ? body.action : ''
  const traffic = await inspectAnalyticsTraffic(req, { deviceInfo })

  if (traffic.skipped) {
    if (action === 'toggle-like') {
      const summary = await getArticleEngagementSummary(articleId, visitorId)
      return NextResponse.json({ liked: summary.likedByVisitor, summary, skipped: traffic.reason })
    }

    if (action === 'share') {
      const summary = await getArticleEngagementSummary(articleId, visitorId)
      return NextResponse.json({ ok: true, summary, skipped: traffic.reason })
    }

    if (action === 'view-enter' || action === 'view-qualified' || action === 'view-leave') {
      return NextResponse.json({ ok: true, recorded: false, skipped: traffic.reason })
    }
  }

  if (action === 'view-enter') {
    const recorded = await recordArticleViewEnter(req, {
      articleId,
      visitorId,
      sessionId,
      path,
      referrer,
      deviceInfo,
      metadata: typeof body.metadata === 'object' && body.metadata ? body.metadata as Record<string, unknown> : null,
    })
    return NextResponse.json({ ok: true, recorded })
  }

  if (action === 'view-qualified') {
    const recorded = await recordArticleQualifiedView(req, {
      articleId,
      visitorId,
      sessionId,
      path,
      referrer,
      duration: typeof body.duration === 'number' ? body.duration : null,
      scrollDepth: typeof body.scrollDepth === 'number' ? body.scrollDepth : null,
      deviceInfo,
      metadata: typeof body.metadata === 'object' && body.metadata ? body.metadata as Record<string, unknown> : null,
    })
    return NextResponse.json({ ok: true, recorded })
  }

  if (action === 'view-leave') {
    const updated = await recordArticleViewLeave({
      articleId,
      visitorId,
      sessionId,
      path,
      referrer,
      duration: typeof body.duration === 'number' ? body.duration : null,
      deviceInfo,
    })
    return NextResponse.json({ ok: true, updated })
  }

  if (action === 'toggle-like') {
    const result = await toggleArticleLike(req, {
      articleId,
      visitorId,
      sessionId,
      path,
      referrer,
      deviceInfo,
    })
    return NextResponse.json(result)
  }

  if (action === 'share') {
    const mode = body.mode === 'image' ? 'image' : 'link'
    const summary = await recordArticleShare(req, {
      articleId,
      visitorId,
      sessionId,
      path,
      referrer,
      mode,
      channel: typeof body.channel === 'string' ? body.channel : mode === 'image' ? 'image_download' : 'copy_link',
      deviceInfo,
      metadata: typeof body.metadata === 'object' && body.metadata ? body.metadata as Record<string, unknown> : null,
    })
    return NextResponse.json({ ok: true, summary })
  }

  return NextResponse.json({ error: '不支持的互动动作' }, { status: 400 })
}
