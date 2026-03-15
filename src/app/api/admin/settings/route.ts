import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAllSettings, updateSettings, SETTING_DEFS } from '@/lib/settings'
import { maskSecret } from '@/lib/encrypt'
import { revalidatePath } from 'next/cache'

function sanitize(v: string): string {
  return v
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
    .trim()
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const settings = await getAllSettings()
  const masked: Record<string, string> = {}
  for (const [key, value] of Object.entries(settings)) {
    const def = SETTING_DEFS[key]
    masked[key] = def?.type === 'encrypted' ? maskSecret(value) : value
  }
  return NextResponse.json({ settings: masked, defs: SETTING_DEFS })
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  }

  const cleaned: Record<string, string> = {}
  for (const [k, rawValue] of Object.entries(body as Record<string, unknown>)) {
    const def = SETTING_DEFS[k]
    if (!def) continue
    if (typeof rawValue !== 'string' || rawValue.length > 2000) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }

    const v = rawValue
    if (k === 'admin.email') {
      const normalized = v.trim().toLowerCase()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
        return NextResponse.json({ error: '管理员邮箱格式不正确' }, { status: 400 })
      }
      cleaned[k] = normalized
      continue
    }

    cleaned[k] = def.type === 'encrypted' ? v : sanitize(v)
  }

  await updateSettings(cleaned)
  if (cleaned['site.title'] !== undefined || cleaned['site.description'] !== undefined) {
    revalidatePath('/', 'layout')
    revalidatePath('/')
    revalidatePath('/about')
    revalidatePath('/guestbook')
  }
  return NextResponse.json({ ok: true })
}
