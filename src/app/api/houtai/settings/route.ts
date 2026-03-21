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

const MAX_LENGTH_BY_KEY: Record<string, number> = {
  'site.favicon': 1000,
  'mascot.systemPrompt': 12000,
  'mascot.identityProfile': 20000,
  'mascot.knowledgeBase': 30000,
  'mascot.replyStyle': 4000,
  'mascot.quickPrompts': 4000,
  'pay.cryptoTips': 4000,
  'blog.cornerContent': 4000,
  'blog.friendLinks': 4000,
  'blog.aboutTitle': 120,
  'blog.aboutSubtitle': 300,
  'blog.aboutAvatar': 1000,
  'blog.aboutCoverImage': 1000,
  'blog.aboutContent': 12000,
  'blog.aboutContactsTitle': 120,
  'blog.aboutContacts': 4000,
  'blog.quickLinkAboutHref': 500,
  'blog.quickLinkGuestbookHref': 500,
}

const REVALIDATE_KEYS = new Set([
  'site.title',
  'site.description',
  'site.favicon',
  'blog.homeTitle',
  'blog.homeDescription',
  'blog.cornerTitle',
  'blog.cornerContent',
  'blog.quickLinksTitle',
  'blog.quickLinkAboutLabel',
  'blog.quickLinkAboutHref',
  'blog.quickLinkGuestbookLabel',
  'blog.quickLinkGuestbookHref',
  'blog.aboutTitle',
  'blog.aboutSubtitle',
  'blog.aboutAvatar',
  'blog.aboutCoverImage',
  'blog.aboutContent',
  'blog.aboutContactsTitle',
  'blog.aboutContacts',
  'blog.footerText',
  'blog.friendLinksTitle',
  'blog.friendLinks',
  'blog.themeVariant',
])

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
    const maxLength = MAX_LENGTH_BY_KEY[k] ?? 2000
    if (typeof rawValue !== 'string' || rawValue.length > maxLength) {
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
  if (Object.keys(cleaned).some(key => REVALIDATE_KEYS.has(key))) {
    revalidatePath('/', 'layout')
    revalidatePath('/')
    revalidatePath('/blog')
    revalidatePath('/blog/[slug]', 'page')
    revalidatePath('/article/[slug]', 'page')
    revalidatePath('/about')
    revalidatePath('/guestbook')
  }
  return NextResponse.json({ ok: true })
}
