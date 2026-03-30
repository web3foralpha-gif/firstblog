import { NextResponse } from 'next/server'

import { normalizeHistory, requestMascotReply, sanitize } from '@/lib/mascot'
import { requireAdmin } from '@/lib/middleware'

export async function POST(req: Request) {
  const { error } = await requireAdmin()
  if (error) return error

  const body = await req.json().catch(() => null)
  const message = sanitize(typeof body?.message === 'string' ? body.message : '', 600)
  const history = normalizeHistory(body?.history)
  const draft = body && typeof body === 'object' && body.draft && typeof body.draft === 'object'
    ? Object.fromEntries(
        Object.entries(body.draft).map(([key, value]) => [key, typeof value === 'string' ? value : `${value ?? ''}`]),
      )
    : undefined

  if (!message.trim()) {
    return NextResponse.json({ error: '请先输入一条测试消息。' }, { status: 400 })
  }

  const result = await requestMascotReply({ message, history, overrides: draft })
  return NextResponse.json(result)
}
