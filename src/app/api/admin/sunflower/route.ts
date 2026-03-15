import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/middleware'

// 重置向日葵（仅管理员，用于测试）
export async function POST(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  await prisma.$transaction([
    prisma.sunflowerInteraction.deleteMany(),
    prisma.sunflowerState.upsert({
      where: { id: 'singleton' },
      update: { totalCount: 0 },
      create: { id: 'singleton', totalCount: 0 },
    }),
  ])

  return NextResponse.json({ success: true, message: '向日葵已重置为种子阶段' })
}
