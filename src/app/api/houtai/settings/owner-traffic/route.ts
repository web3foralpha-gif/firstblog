import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'
import {
  buildOwnerDeviceLabel,
  buildOwnerDeviceSignature,
  invalidateOwnerTrafficRulesCache,
} from '@/lib/analytics-traffic'
import { updateSettings, getSetting } from '@/lib/settings'

function parseLines(raw: string) {
  return raw
    .split(/\r?\n|,/)
    .map(item => item.trim())
    .filter(Boolean)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: '请求数据无效' }, { status: 400 })
  }

  const payload = body as { action?: unknown; deviceInfo?: unknown }

  if (payload.action !== 'append-device') {
    return NextResponse.json({ error: '不支持的操作' }, { status: 400 })
  }

  const userAgent = req.headers.get('user-agent') || ''
  const signature = buildOwnerDeviceSignature(userAgent, payload.deviceInfo)
  if (!signature) {
    return NextResponse.json({ error: '当前设备签名生成失败，请换个浏览器再试试' }, { status: 400 })
  }

  const existingRaw = await getSetting('analytics.ownerDeviceAllowlist')
  const items = parseLines(existingRaw)
  const existed = items.includes(signature)

  if (!existed) {
    const nextValue = [...items, signature].join('\n')
    await updateSettings({ 'analytics.ownerDeviceAllowlist': nextValue })
    invalidateOwnerTrafficRulesCache()
  }

  return NextResponse.json({
    ok: true,
    existed,
    signature,
    label: buildOwnerDeviceLabel(userAgent, payload.deviceInfo),
  })
}
