import bcrypt from 'bcryptjs'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, ctx: RouteContext<'/api/articles/[slug]/unlock'>) {
  try {
    const { slug } = await ctx.params
    const body = await req.json().catch(() => null)
    const password = typeof body?.password === 'string' ? body.password : ''

    if (!password) {
      return NextResponse.json({ error: '请输入密码' }, { status: 400 })
    }

    const article = await prisma.article.findFirst({
      where: {
        slug,
        published: true,
      },
      select: {
        accessType: true,
        passwordHash: true,
        content: true,
      },
    })

    if (!article) {
      return NextResponse.json({ error: '文章不存在' }, { status: 404 })
    }

    if (article.accessType !== 'PASSWORD') {
      return NextResponse.json({ error: '当前文章无需密码解锁', content: article.content })
    }

    if (!article.passwordHash) {
      return NextResponse.json({ error: '文章密码未正确配置' }, { status: 500 })
    }

    const matched = await bcrypt.compare(password, article.passwordHash)

    if (!matched) {
      return NextResponse.json({ error: '密码错误，请重试' }, { status: 401 })
    }

    return NextResponse.json({ content: article.content })
  } catch (error) {
    console.error('[article/unlock] unlock failed:', error)
    return NextResponse.json({ error: '解锁失败，请稍后再试' }, { status: 500 })
  }
}
