import { NextResponse } from 'next/server'

import { buildMascotPreview } from '@/lib/mascot'
import { requireAdmin } from '@/lib/middleware'

export async function POST(req: Request) {
  const { error } = await requireAdmin()
  if (error) return error

  const body = await req.json().catch(() => null)
  const draft = body && typeof body === 'object' && body.draft && typeof body.draft === 'object'
    ? Object.fromEntries(
        Object.entries(body.draft).map(([key, value]) => [key, typeof value === 'string' ? value : `${value ?? ''}`]),
      )
    : undefined

  const preview = await buildMascotPreview(draft)
  return NextResponse.json({ preview })
}
