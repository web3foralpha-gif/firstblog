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

  const where: Record<string, unknown> = {}
  if (search) where.id = { contains: search }

  const [payments, total, agg] = await Promise.all([
    prisma.payment.findMany({
      where, skip: (page - 1) * pageSize, take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: { article: { select: { title: true } } },
    }),
    prisma.payment.count({ where }),
    prisma.payment.aggregate({ where: { status: 'COMPLETED' }, _sum: { amount: true } }),
  ])

  return NextResponse.json({ payments, total, revenue: agg._sum.amount ?? 0 })
}
