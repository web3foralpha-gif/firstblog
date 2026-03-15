import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const { password } = await req.json()
  if (!password) return NextResponse.json({ error: '请输入密码' }, { status: 400 })

  const article = await prisma.article.findUnique({
    where: { slug: params.slug, published: true, accessType: 'PASSWORD' },
    select: { content: true, passwordHash: true },
  })

  if (!article || !article.passwordHash) {
    return NextResponse.json({ error: '文章不存在' }, { status: 404 })
  }

  const valid = await bcrypt.compare(password, article.passwordHash)
  if (!valid) return NextResponse.json({ error: '密码错误' }, { status: 401 })

  return NextResponse.json({ content: article.content })
}
