import { NextResponse } from 'next/server'
import { getSetting } from '@/lib/settings'
import { decrypt } from '@/lib/encrypt'
import { prisma } from '@/lib/prisma'

// 皮卡丘风格兜底回复（AI 不可用时使用）
const FALLBACK_REPLIES = [
  '皮卡～！（我现在有点累，稍后再聊吧）',
  '皮卡丘！⚡（AI 助手暂时休息中）',
  '皮～卡！（稍等一下，我充个电）',
  '（皮卡丘歪头看着你）…皮？',
]

function fallback() {
  return FALLBACK_REPLIES[Math.floor(Math.random() * FALLBACK_REPLIES.length)]
}

// 简单 XSS 过滤
function sanitize(s: string) {
  return s.replace(/[<>]/g, '').slice(0, 500)
}

export async function POST(req: Request) {
  let message = ''
  try {
    const body = await req.json()
    message = sanitize(body.message ?? '')
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!message.trim()) {
    return NextResponse.json({ reply: '你好像什么都没说呢～ 皮卡？' })
  }

  // 读取 AI 配置
  const apiKey      = await getSetting('mascot.aiApiKey')   // 加密存储
  const apiBase     = await getSetting('mascot.aiApiBase')  // e.g. https://api.openai.com/v1
  const model       = await getSetting('mascot.aiModel')    // e.g. gpt-4o-mini
  const systemPrompt = await getSetting('mascot.systemPrompt')
  const aiEnabled   = await getSetting('mascot.aiEnabled')

  // AI 未启用或未配置密钥 → 直接走兜底
  if (aiEnabled !== 'true' || !apiKey) {
    return NextResponse.json({ reply: fallback() })
  }

  // 解密 API Key
  let decryptedKey = ''
  try { decryptedKey = decrypt(apiKey) } catch { /* ignore */ }
  if (!decryptedKey) {
    return NextResponse.json({ reply: fallback() })
  }

  const baseUrl = apiBase || 'https://api.openai.com/v1'
  const useModel = model || 'gpt-4o-mini'

  const defaultSystemPrompt = `你是网站吉祥物皮卡丘，性格活泼可爱，说话简短风趣。
回复要求：
- 简洁，不超过 80 字
- 偶尔夹杂「皮卡」「皮」等拟声词
- 可以回答问题、聊天、对网站内容提供帮助
- 禁止生成有害内容`

  try {
    const aiRes = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${decryptedKey}`,
      },
      body: JSON.stringify({
        model: useModel,
        max_tokens: 150,
        messages: [
          { role: 'system', content: systemPrompt || defaultSystemPrompt },
          { role: 'user',   content: message },
        ],
      }),
      signal: AbortSignal.timeout(8000), // 8 秒超时
    })

    if (!aiRes.ok) {
      console.error('[Mascot AI] API error:', aiRes.status, await aiRes.text())
      return NextResponse.json({ reply: fallback() })
    }

    const data = await aiRes.json()
    const reply = data.choices?.[0]?.message?.content?.trim() || fallback()
    return NextResponse.json({ reply })

  } catch (e) {
    console.error('[Mascot AI] fetch error:', e)
    return NextResponse.json({ reply: fallback() })
  }
}
