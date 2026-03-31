import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/middleware'

async function ensureAdmin() {
  const { error } = await requireAdmin()
  return error
}

function unavailableResponse(status = 200) {
  return NextResponse.json(
    {
      interactions: [],
      unavailable: true,
      message: '向日葵数据库暂时不可用。',
    },
    { status }
  )
}

export async function GET() {
  const error = await ensureAdmin()
  if (error) return error

  try {
    const interactions = await prisma.sunflowerInteraction.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        ipHash: true,
        action: true,
        ipAddress: true,
        ipCountry: true,
        ipRegion: true,
        ipCity: true,
        ipIsp: true,
        userAgent: true,
        deviceInfo: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      interactions: interactions.map((item) => ({
        id: item.ipHash,
        ipHash: item.ipHash,
        action: item.action,
        ipAddress: item.ipAddress,
        ipCountry: item.ipCountry,
        ipRegion: item.ipRegion,
        ipCity: item.ipCity,
        ipIsp: item.ipIsp,
        userAgent: item.userAgent,
        deviceInfo: item.deviceInfo,
        createdAt: item.createdAt,
      })),
      unavailable: false,
      message: '',
    })
  } catch (error) {
    console.error('Admin sunflower GET error:', error)
    return unavailableResponse()
  }
}

async function resetSunflower() {
  await prisma.$transaction([
    prisma.sunflowerInteraction.deleteMany(),
    prisma.sunflowerState.upsert({
      where: { id: 'singleton' },
      update: { totalCount: 0 },
      create: { id: 'singleton', totalCount: 0 },
    }),
  ])
}

// 重置向日葵（仅管理员，用于测试）
export async function POST() {
  const error = await ensureAdmin()
  if (error) return error

  try {
    await resetSunflower()
    return NextResponse.json({ success: true, message: '向日葵已重置为种子阶段' })
  } catch (error) {
    console.error('Admin sunflower POST error:', error)
    return NextResponse.json({ success: false, error: '向日葵数据库暂时不可用。' }, { status: 503 })
  }
}

export async function DELETE() {
  const error = await ensureAdmin()
  if (error) return error

  try {
    await resetSunflower()
    return NextResponse.json({ success: true, message: '向日葵已重置为种子阶段' })
  } catch (error) {
    console.error('Admin sunflower DELETE error:', error)
    return NextResponse.json({ success: false, error: '向日葵数据库暂时不可用。' }, { status: 503 })
  }
}
