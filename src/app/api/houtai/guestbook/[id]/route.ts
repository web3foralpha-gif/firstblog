import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/middleware'
import { revalidatePath } from 'next/cache'

type RouteContext = { params: Promise<{ id: string }> }

async function handleUpdate(req: NextRequest, { params }: RouteContext) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id } = await params
  const body = await req.json()
  const data: any = {}

  if (body.action === 'delete') {
    await prisma.guestbook.delete({ where: { id } })
    revalidatePath('/guestbook')
    return NextResponse.json({ success: true })
  }

  if (body.action !== undefined) {
    if (body.action === 'approve') data.status = 'APPROVED'
    else if (body.action === 'reject') data.status = 'REJECTED'
    else if (body.action === 'pending') data.status = 'PENDING'
    else if (body.action === 'showEmail') data.emailVisible = true
    else if (body.action === 'hideEmail') data.emailVisible = false
    else if (body.action === 'pin') {
      data.pinned = true
      data.pinnedAt = new Date()
    } else if (body.action === 'unpin') {
      data.pinned = false
      data.pinnedAt = null
    }
    else return NextResponse.json({ error: '无效操作' }, { status: 400 })
  }

  if (body.status !== undefined) {
    if (!['APPROVED', 'REJECTED', 'PENDING'].includes(body.status)) {
      return NextResponse.json({ error: '无效状态' }, { status: 400 })
    }
    data.status = body.status
  }

  if (body.emailVisible !== undefined) {
    data.emailVisible = !!body.emailVisible
  }

  if (body.pinned !== undefined) {
    data.pinned = !!body.pinned
    data.pinnedAt = body.pinned ? new Date() : null
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: '没有可更新的字段' }, { status: 400 })
  }

  const message = await prisma.guestbook.update({ where: { id }, data })
  revalidatePath('/guestbook')
  return NextResponse.json(message)
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  return handleUpdate(req, ctx)
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  return handleUpdate(req, ctx)
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { error } = await requireAdmin()
  if (error) return error
  const { id } = await params
  await prisma.guestbook.delete({ where: { id } })
  revalidatePath('/guestbook')
  return NextResponse.json({ success: true })
}
