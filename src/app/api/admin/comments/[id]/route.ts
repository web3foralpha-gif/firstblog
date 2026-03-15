import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/middleware'

async function handleUpdate(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin()
  if (error) return error

  const body = await req.json()
  if (body.action === 'delete') {
    await prisma.comment.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  }

  const status =
    body.status ??
    (body.action === 'approve'
      ? 'APPROVED'
      : body.action === 'reject'
        ? 'REJECTED'
        : body.action === 'pending'
          ? 'PENDING'
          : undefined)

  if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
    return NextResponse.json({ error: '无效状态' }, { status: 400 })
  }

  const comment = await prisma.comment.update({
    where: { id: params.id },
    data: { status },
  })
  return NextResponse.json(comment)
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  return handleUpdate(req, ctx)
}

export async function PUT(req: NextRequest, ctx: { params: { id: string } }) {
  return handleUpdate(req, ctx)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin()
  if (error) return error

  await prisma.comment.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
