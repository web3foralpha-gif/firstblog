import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/middleware'
import { generateExcerpt } from '@/lib/utils'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { hasMeaningfulArticleContent } from '@/lib/article-content'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin()
  if (error) return error

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

    const data: any = {
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

    const article = await prisma.article.update({
      where: { id: params.id },
      data,
    })

    revalidatePath('/')
    revalidatePath(`/article/${article.slug}`)
    return NextResponse.json(article)
  } catch (err) {
    console.error('[admin/articles] update failed:', err)
    return NextResponse.json({ error: '保存失败，请稍后重试' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin()
  if (error) return error

  const body = await req.json()
  if (typeof body?.pinned !== 'boolean') {
    return NextResponse.json({ error: '缺少置顶状态' }, { status: 400 })
  }

  const article = await prisma.article.update({
    where: { id: params.id },
    data: {
      pinned: body.pinned,
      pinnedAt: body.pinned ? new Date() : null,
    },
  })

  revalidatePath('/')
  revalidatePath(`/article/${article.slug}`)
  return NextResponse.json(article)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin()
  if (error) return error

  const article = await prisma.article.findUnique({ where: { id: params.id }, select: { slug: true } })
  await prisma.article.delete({ where: { id: params.id } })
  revalidatePath('/')
  if (article?.slug) {
    revalidatePath(`/article/${article.slug}`)
  }
  return NextResponse.json({ success: true })
}
