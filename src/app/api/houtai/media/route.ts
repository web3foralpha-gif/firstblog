import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { deleteStoredMedia } from '@/lib/media-storage'

export const runtime = 'nodejs'

// 获取媒体库列表
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')  // IMAGE | VIDEO | null（全部）
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const limit = 24

  const where = type ? { type: type as 'IMAGE' | 'VIDEO' } : {}

  const [items, total] = await Promise.all([
    prisma.media.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.media.count({ where }),
  ])

  return NextResponse.json({ items, total, page, totalPages: Math.ceil(total / limit) })
}

// 删除媒体文件
export async function DELETE(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  const media = await prisma.media.findUnique({ where: { id } })
  if (!media) return NextResponse.json({ error: '文件不存在' }, { status: 404 })

  await deleteStoredMedia(media.key)

  // 从数据库删除记录
  await prisma.media.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
