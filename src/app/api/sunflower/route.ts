import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getStageInfo, hashIP, getClientIP } from '@/lib/sunflower'

function fallbackState(message = '向日葵今天在休息，晚一点再来看看它吧。') {
  return {
    success: false,
    unavailable: true,
    alreadyDone: false,
    message,
    ...getStageInfo(0),
  }
}

// GET：获取当前向日葵状态
export async function GET() {
  try {
    const state = await prisma.sunflowerState.upsert({
      where: { id: 'singleton' },
      update: {},
      create: { id: 'singleton', totalCount: 0 },
    })

    return NextResponse.json({
      success: true,
      unavailable: false,
      message: '',
      ...getStageInfo(state.totalCount),
    })
  } catch (error) {
    console.error('Sunflower GET error:', error)
    return NextResponse.json(fallbackState())
  }
}

// POST：记录一次互动
export async function POST(req: NextRequest) {
  const { action } = await req.json()
  if (!['water', 'fertilize', 'sun'].includes(action)) {
    return NextResponse.json({ error: '无效操作' }, { status: 400 })
  }

  const ip = getClientIP(req)
  const ipHash = hashIP(ip)

  // 用数据库事务保证原子性：尝试插入 IP 记录，若已存在则说明已互动
  try {
    const [, state] = await prisma.$transaction(async (tx) => {
      // 尝试插入（主键冲突则抛出异常）
      const interaction = await tx.sunflowerInteraction.create({
        data: { ipHash, action },
      })

      // 插入成功 → 计数 +1
      const updated = await tx.sunflowerState.upsert({
        where: { id: 'singleton' },
        update: { totalCount: { increment: 1 } },
        create: { id: 'singleton', totalCount: 1 },
      })

      return [interaction, updated]
    })

    return NextResponse.json({
      success: true,
      unavailable: false,
      alreadyDone: false,
      message: '',
      ...getStageInfo(state.totalCount),
    })
  } catch (err: any) {
    // Prisma P2002 = 唯一键冲突（IP 已存在）
    if (err?.code === 'P2002') {
      const state = await prisma.sunflowerState.findUnique({ where: { id: 'singleton' } }).catch(() => null)
      return NextResponse.json({
        success: false,
        unavailable: false,
        alreadyDone: true,
        message: '',
        ...getStageInfo(state?.totalCount ?? 0),
      })
    }
    console.error('Sunflower error:', err)
    return NextResponse.json(
      fallbackState('向日葵今天先休息一下，稍后再来看看它吧。'),
      { status: 200 }
    )
  }
}
