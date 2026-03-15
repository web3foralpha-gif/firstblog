import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const { articleId, nickname, email, content } = await req.json()
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

  await prisma.comment.create({
    data: {
      articleId,
      nickname: nickname.trim().slice(0, 30),
      email: normalizedEmail || null,
      content: content.trim(),
      status: 'PENDING',
    },
  })

  return NextResponse.json({ message: '评论已提交，待审核后显示' })
}
