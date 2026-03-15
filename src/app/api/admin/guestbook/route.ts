import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page     = Math.max(1, Number(searchParams.get('page') ?? 1))
  const pageSize = Math.min(50, Number(searchParams.get('pageSize') ?? 20))
  const search   = searchParams.get('search') ?? ''
  const status   = searchParams.get('status') ?? 'ALL'

  const where: Record<string, unknown> = {}
  if (search) where.OR = [{ content: { contains: search } }, { nickname: { contains: search } }]
  if (status !== 'ALL') where.status = status

  const [entries, total] = await Promise.all([
    prisma.guestbook.findMany({
      where, skip: (page - 1) * pageSize, take: pageSize,
      orderBy: [{ pinned: 'desc' }, { pinnedAt: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.guestbook.count({ where }),
  ])

  return NextResponse.json({ entries, total })
}
