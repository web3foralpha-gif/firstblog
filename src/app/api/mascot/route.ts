import { NextRequest, NextResponse } from 'next/server'

import { buildMascotChatLogContext, recordMascotChatLog } from '@/lib/mascot-analytics'
import { normalizeHistory, requestMascotReply, sanitize } from '@/lib/mascot'

export async function POST(req: NextRequest) {
  let message = ''
  let history = []
  let requestContext: Awaited<ReturnType<typeof buildMascotChatLogContext>> | null = null

  try {
    const body = await req.json()
    message = sanitize(typeof body.message === 'string' ? body.message : '')
    history = normalizeHistory(body.history)
    requestContext = await buildMascotChatLogContext(req, {
      sessionId: body.sessionId,
      visitorId: body.visitorId,
      path: body.path,
      referrer: body.referrer,
      deviceInfo: body.deviceInfo,
    })
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const result = await requestMascotReply({ message, history })
  if (requestContext) {
    void recordMascotChatLog({
      context: requestContext,
      message,
      result,
    })
  }
  return NextResponse.json({ reply: result.reply })
}
