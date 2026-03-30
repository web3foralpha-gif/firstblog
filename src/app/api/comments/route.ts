import { NextRequest, NextResponse } from 'next/server'
import { inspectAnalyticsTraffic } from '@/lib/analytics-traffic'
import { recordArticleCommentSubmission } from '@/lib/article-engagement'
import { getGeoInfo } from '@/lib/geo'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const { articleId, nickname, email, content, visitorId, sessionId, path, referrer, deviceInfo } = await req.json()
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''

  if (!articleId || !nickname?.trim() || !content?.trim()) {
    return NextResponse.json({ error: '请填写昵称和评论内容' }, { status: 400 })
  }

  if (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 })
  }

  // 内容长度限制
  if (content.length > 1000) {
    return NextResponse.json({ error: '评论内容过长' }, { status: 400 })
  }

  const article = await prisma.article.findUnique({
    where: { id: articleId, published: true },
  })
  if (!article) return NextResponse.json({ error: '文章不存在' }, { status: 404 })

  const traffic = await inspectAnalyticsTraffic(req, { deviceInfo })
  const ipAddress = traffic.ipAddress || '127.0.0.1'
  const geo = await getGeoInfo(ipAddress)
  const userAgent = traffic.userAgent.slice(0, 200)

  const comment = await prisma.comment.create({
    data: {
      articleId,
      visitorId: typeof visitorId === 'string' ? visitorId : null,
      sessionId: typeof sessionId === 'string' ? sessionId : null,
      nickname: nickname.trim().slice(0, 30),
      email: normalizedEmail || null,
      content: content.trim(),
      ipAddress,
      ipRegion: geo?.region || null,
      ipCity: geo?.city || null,
      referrer: typeof referrer === 'string' ? referrer.slice(0, 500) : null,
      userAgent,
      status: 'PENDING',
    },
  })

  if (!traffic.skipped && typeof visitorId === 'string' && visitorId) {
    await recordArticleCommentSubmission(req, {
      articleId,
      visitorId,
      sessionId: typeof sessionId === 'string' ? sessionId : null,
      path: typeof path === 'string' ? path : null,
      referrer: typeof referrer === 'string' ? referrer : null,
      commentId: comment.id,
      nickname: comment.nickname,
    })
  }

  return NextResponse.json({ message: '评论已提交，待审核后显示' })
}
