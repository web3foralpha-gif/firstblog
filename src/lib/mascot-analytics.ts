import type { Prisma } from '@prisma/client'
import type { NextRequest } from 'next/server'

import { enrichDeviceInfoWithSignature, inspectAnalyticsTraffic } from '@/lib/analytics-traffic'
import { getGeoInfo } from '@/lib/geo'
import type { MascotReplyResult } from '@/lib/mascot'
import { prisma } from '@/lib/prisma'

type MascotChatInput = {
  sessionId?: unknown
  visitorId?: unknown
  path?: unknown
  referrer?: unknown
  deviceInfo?: unknown
}

type MascotChatLogContext = {
  shouldLog: boolean
  skipReason: 'admin' | 'owner_allowlist' | null
  sessionId: string | null
  visitorId: string | null
  path: string | null
  referrer: string | null
  ipAddress: string | null
  ipRegion: string | null
  ipCity: string | null
  userAgent: string
  deviceInfo: unknown | null
}

function sanitizeString(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) || null : null
}

function toJsonValue(value: unknown): Prisma.InputJsonValue | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

export async function buildMascotChatLogContext(req: NextRequest, input: MascotChatInput): Promise<MascotChatLogContext> {
  const userAgent = (req.headers.get('user-agent') || '').slice(0, 200)
  const safeDeviceInfo = enrichDeviceInfoWithSignature(userAgent, input.deviceInfo)
  const traffic = await inspectAnalyticsTraffic(req, { deviceInfo: safeDeviceInfo })

  if (traffic.skipped) {
    return {
      shouldLog: false,
      skipReason: traffic.reason,
      sessionId: sanitizeString(input.sessionId, 120),
      visitorId: sanitizeString(input.visitorId, 120),
      path: sanitizeString(input.path, 300),
      referrer: sanitizeString(input.referrer, 500),
      ipAddress: traffic.ipAddress,
      ipRegion: null,
      ipCity: null,
      userAgent: traffic.userAgent.slice(0, 200),
      deviceInfo: safeDeviceInfo,
    }
  }

  const geo = traffic.ipAddress ? await getGeoInfo(traffic.ipAddress) : null

  return {
    shouldLog: true,
    skipReason: null,
    sessionId: sanitizeString(input.sessionId, 120),
    visitorId: sanitizeString(input.visitorId, 120),
    path: sanitizeString(input.path, 300),
    referrer: sanitizeString(input.referrer, 500),
    ipAddress: traffic.ipAddress,
    ipRegion: geo?.region || null,
    ipCity: geo?.city || null,
    userAgent: traffic.userAgent.slice(0, 200),
    deviceInfo: safeDeviceInfo,
  }
}

export async function recordMascotChatLog(input: {
  context: MascotChatLogContext
  message: string
  result: MascotReplyResult
}) {
  if (!input.context.shouldLog) return

  try {
    await prisma.mascotChatLog.create({
      data: {
        sessionId: input.context.sessionId,
        visitorId: input.context.visitorId,
        path: input.context.path,
        referrer: input.context.referrer,
        message: input.message.slice(0, 2000),
        reply: input.result.reply.slice(0, 4000),
        messageChars: input.message.length,
        replyChars: input.result.reply.length,
        mode: input.result.preview.mode,
        model: input.result.preview.model,
        apiBase: input.result.preview.apiBase,
        success: input.result.success,
        fallbackUsed: input.result.fallbackUsed,
        providerStatus: input.result.providerStatus,
        errorType: input.result.errorType,
        latencyMs: input.result.latencyMs,
        ipAddress: input.context.ipAddress,
        ipRegion: input.context.ipRegion,
        ipCity: input.context.ipCity,
        userAgent: input.context.userAgent,
        ...(input.context.deviceInfo ? { deviceInfo: toJsonValue(input.context.deviceInfo) } : {}),
      },
    })
  } catch (error) {
    console.error('[Mascot AI] failed to record chat log:', error)
  }
}
