import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { generateExcerpt, generateSlug } from '@/lib/utils'
import bcrypt from 'bcryptjs'
import { hasMeaningfulArticleContent } from '@/lib/article-content'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page     = Math.max(1, Number(searchParams.get('page') ?? 1))
  const pageSize = Math.min(50, Number(searchParams.get('pageSize') ?? 15))
  const search   = searchParams.get('search') ?? ''
  const filter   = searchParams.get('filter') ?? 'ALL'
  const sortKey  = searchParams.get('sortKey') ?? 'createdAt'
  const sortDir  = (searchParams.get('sortDir') ?? 'desc') as 'asc' | 'desc'
  const safeSortKey = ['createdAt', 'title', 'accessType', 'published'].includes(sortKey) ? sortKey : 'createdAt'

  const where: Record<string, unknown> = {}
  if (search) where.OR = [{ title: { contains: search } }, { slug: { contains: search } }]
  if (filter !== 'ALL') where.accessType = filter

  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where, skip: (page - 1) * pageSize, take: pageSize,
      orderBy: [{ pinned: 'desc' }, { pinnedAt: 'desc' }, { [safeSortKey]: sortDir }],
      select: { id: true, slug: true, title: true, mood: true, accessType: true, createdAt: true, published: true, pinned: true, _count: { select: { comments: true } } },
    }),
    prisma.article.count({ where }),
  ])

  return NextResponse.json({ articles, total })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { title, content, mood, coverImage, accessType, password, passwordHint, price, published, pinned } = await req.json()

    if (!title?.trim() || !hasMeaningfulArticleContent(content || '')) {
      return NextResponse.json({ error: '标题和内容不能为空' }, { status: 400 })
    }

    if (accessType === 'PASSWORD' && !password?.trim()) {
      return NextResponse.json({ error: '请设置访问密码' }, { status: 400 })
    }

    if (accessType === 'PAID' && (!price || Number(price) <= 0)) {
      return NextResponse.json({ error: '请设置有效的打赏金额' }, { status: 400 })
    }

    const slug = generateSlug(title)
    const data: {
      slug: string
      title: string
      content: string
      excerpt: string
      mood: string
      coverImage: string | null
      accessType: string
      published: boolean
      pinned: boolean
      pinnedAt: Date | null
      passwordHash: string | null
      passwordHint: string | null
      price: number | null
    } = {
      slug,
      title: title.trim(),
      content: content.trim(),
      excerpt: generateExcerpt(content),
      mood: mood || '',
      coverImage: coverImage || null,
      accessType,
      published: Boolean(published),
      pinned: Boolean(pinned),
      pinnedAt: pinned ? new Date() : null,
      passwordHash: null,
      passwordHint: null,
      price: null,
    }

    if (accessType === 'PASSWORD') {
      data.passwordHash = await bcrypt.hash(password, 12)
      data.passwordHint = passwordHint?.trim() || null
    }

    if (accessType === 'PAID') {
      data.price = Number(price)
    }

    const article = await prisma.article.create({ data })
    revalidatePath('/')
    revalidatePath(`/article/${article.slug}`)
    return NextResponse.json(article)
  } catch (err) {
    console.error('[admin/articles] create failed:', err)
    return NextResponse.json({ error: '发布失败，请稍后重试' }, { status: 500 })
  }
}
