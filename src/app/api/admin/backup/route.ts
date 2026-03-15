import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/admin/backup?type=full|articles|comments|guestbook|settings
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') ?? 'full'

  try {
    const data = await collectData(type)
    const json = JSON.stringify(data, null, 2)
    const bytes = Buffer.from(json, 'utf-8')

    const now = new Date()
    const stamp = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`
    const filename = `blog_backup_${type}_${stamp}.json`

    return new Response(bytes, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(bytes.length),
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    console.error('[Backup]', e)
    return NextResponse.json({ error: '备份失败，请查看服务器日志' }, { status: 500 })
  }
}

async function collectData(type: string) {
  const meta = {
    exportedAt: new Date().toISOString(),
    type,
    version: '1.0',
  }

  if (type === 'articles') {
    const articles = await prisma.article.findMany({
      orderBy: { createdAt: 'desc' },
      include: { comments: true },
    })
    return { meta, articles }
  }

  if (type === 'comments') {
    const comments = await prisma.comment.findMany({
      orderBy: { createdAt: 'desc' },
      include: { article: { select: { title: true, slug: true } } },
    })
    return { meta, comments }
  }

  if (type === 'guestbook') {
    const guestbook = await prisma.guestbook.findMany({ orderBy: { createdAt: 'desc' } })
    return { meta, guestbook }
  }

  if (type === 'settings') {
    const settings = await prisma.setting.findMany()
    // 不导出加密字段的值，只导出 key
    const safeSettings = settings.map(s => ({
      ...s,
      value: s.type === 'encrypted' ? '[ENCRYPTED - NOT EXPORTED]' : s.value,
    }))
    return { meta, settings: safeSettings }
  }

  if (type === 'payments') {
    const payments = await prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      include: { article: { select: { title: true, slug: true } } },
    })
    return { meta, payments }
  }

  // type === 'full' — 全量备份
  const [articles, comments, guestbook, payments, pageViews, settings, sunflower] =
    await Promise.all([
      prisma.article.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.comment.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.guestbook.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.payment.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.pageView.findMany({ orderBy: { enteredAt: 'desc' }, take: 10000 }), // 最多1万条
      prisma.setting.findMany(),
      prisma.sunflowerState.findUnique({ where: { id: 'singleton' } }),
    ])

  const safeSettings = settings.map(s => ({
    ...s,
    value: s.type === 'encrypted' ? '[ENCRYPTED - NOT EXPORTED]' : s.value,
  }))

  return {
    meta,
    summary: {
      articles: articles.length,
      comments: comments.length,
      guestbook: guestbook.length,
      payments: payments.length,
      pageViews: pageViews.length,
    },
    articles,
    comments,
    guestbook,
    payments,
    pageViews,
    settings: safeSettings,
    sunflower,
  }
}
