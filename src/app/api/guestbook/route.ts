import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getGeoInfo } from '@/lib/geo'
import { getPublicGuestbookEmail } from '@/lib/guestbook'
import { revalidatePath } from 'next/cache'

const AVATARS = ['🌸', '🌿', '🍃', '🌙', '⭐', '🌊', '🍀', '🌻', '🦋', '🌈', '🍂', '🔮', '🌺', '🍁', '✨']
function randomAvatar() { return AVATARS[Math.floor(Math.random() * AVATARS.length)] }

function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') || req.headers.get('cf-connecting-ip') || '127.0.0.1'
}

// GET：公开留言列表
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const limit = 20

  const [messages, total] = await Promise.all([
    prisma.guestbook.findMany({
      where: { status: 'APPROVED' },
      orderBy: [{ pinned: 'desc' }, { pinnedAt: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, nickname: true, avatar: true,
        content: true, emoji: true, createdAt: true, pinned: true,
        email: true,
        emailPublic: true,   // 留言者自己的意愿
        emailVisible: true,  // admin 的覆盖决定
      },
    }),
    prisma.guestbook.count({ where: { status: 'APPROVED' } }),
  ])

  const safeMessages = messages.map(m => ({
    ...m,
    email: getPublicGuestbookEmail(m),
  }))

  return NextResponse.json({ messages: safeMessages, total, totalPages: Math.ceil(total / limit) })
}

// POST：提交留言
export async function POST(req: NextRequest) {
  const { content, emoji, nickname, email, emailPublic } = await req.json()

  if (!nickname?.trim())           return NextResponse.json({ error: '请填写昵称' }, { status: 400 })
  if (nickname.trim().length > 20) return NextResponse.json({ error: '昵称不超过 20 字' }, { status: 400 })
  if (!content?.trim())            return NextResponse.json({ error: '留言内容不能为空' }, { status: 400 })
  if (content.trim().length > 200) return NextResponse.json({ error: '留言不超过 200 字' }, { status: 400 })
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 })

  const ip = getClientIP(req)
  const geo = await getGeoInfo(ip)

  await prisma.guestbook.create({
    data: {
      nickname:     nickname.trim(),
      avatar:       randomAvatar(),
      email:        email?.trim().toLowerCase() || null,
      emailPublic:  !!emailPublic,
      emailVisible: !!emailPublic,
      content:      content.trim(),
      emoji:        emoji || null,
      ipAddress:    ip,
      ipCountry:    geo?.country || null,
      ipRegion:     geo?.region  || null,
      ipCity:       geo?.city    || null,
      ipIsp:        geo?.isp     || null,
      status:       'PENDING',
    },
  })

  revalidatePath('/guestbook')

  return NextResponse.json({ message: '留言已提交，审核后将显示在留言板 ✨' })
}
