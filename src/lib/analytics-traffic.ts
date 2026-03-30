import { createHash } from 'crypto'
import type { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { getToken } from 'next-auth/jwt'

import { describeDevice, parseUserAgent, sanitizeDeviceInfo, type DeviceInfoPayload } from '@/lib/device-info'
import { getSetting } from '@/lib/settings'

type HeaderReader = {
  get(name: string): string | null
}

type OwnerTrafficRules = {
  ips: string[]
  devices: string[]
}

type MatchInput = {
  ipAddress?: string | null
  userAgent?: string | null
  deviceInfo?: unknown
}

type MatchResult = {
  matched: boolean
  matchedByIp: boolean
  matchedByDevice: boolean
  deviceLabel: string
  deviceSignature: string | null
}

type TrafficInspection = MatchResult & {
  ipAddress: string | null
  userAgent: string
  skipped: boolean
  reason: 'admin' | 'owner_allowlist' | null
}

const OWNER_RULES_CACHE_TTL_MS = 15 * 1000

let ownerRulesCache:
  | {
      expiresAt: number
      value: OwnerTrafficRules
    }
  | null = null

function parseAllowlist(raw: string) {
  return raw
    .split(/\r?\n|,/)
    .map(item => item.trim())
    .filter(Boolean)
}

export function getClientIpFromHeaders(headers: HeaderReader) {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    const [first] = forwarded.split(',')
    const value = first?.trim()
    if (value) return value
  }

  const realIp = headers.get('x-real-ip')?.trim()
  return realIp || null
}

export async function isAdminTrafficRequest(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    return token?.role === 'admin' || token?.sub === 'admin'
  } catch {
    return false
  }
}

export async function getOwnerTrafficRules(): Promise<OwnerTrafficRules> {
  if (ownerRulesCache && ownerRulesCache.expiresAt > Date.now()) {
    return ownerRulesCache.value
  }

  const [ipRaw, deviceRaw] = await Promise.all([
    getSetting('analytics.ownerIpAllowlist'),
    getSetting('analytics.ownerDeviceAllowlist'),
  ])

  const value = {
    ips: parseAllowlist(ipRaw),
    devices: parseAllowlist(deviceRaw),
  }

  ownerRulesCache = {
    value,
    expiresAt: Date.now() + OWNER_RULES_CACHE_TTL_MS,
  }

  return value
}

export function buildOwnerDeviceLabel(userAgent?: string | null, deviceInfo?: unknown) {
  const safeDeviceInfo = sanitizeDeviceInfo(deviceInfo)
  const description = describeDevice(userAgent, safeDeviceInfo)
  return description.detail ? `${description.summary} · ${description.detail}` : description.summary
}

function buildDeviceSignatureSource(userAgent?: string | null, deviceInfo?: DeviceInfoPayload | null) {
  const parsed = parseUserAgent(userAgent)

  return {
    userAgent: (userAgent || '').trim(),
    type: parsed.type,
    browserName: parsed.browserName,
    browserVersion: parsed.browserVersion,
    osName: parsed.osName,
    osVersion: parsed.osVersion,
    model: deviceInfo?.model || parsed.model || null,
    platform: deviceInfo?.platform || null,
    platformVersion: deviceInfo?.platformVersion || null,
    mobile: deviceInfo?.mobile ?? null,
    brands: deviceInfo?.brands || [],
    screenWidth: deviceInfo?.screenWidth ?? null,
    screenHeight: deviceInfo?.screenHeight ?? null,
    pixelRatio: deviceInfo?.pixelRatio ?? null,
    colorDepth: deviceInfo?.colorDepth ?? null,
    language: deviceInfo?.language || null,
    languages: deviceInfo?.languages || [],
    timezone: deviceInfo?.timezone || null,
    maxTouchPoints: deviceInfo?.maxTouchPoints ?? null,
    memoryGb: deviceInfo?.memoryGb ?? null,
    cpuCores: deviceInfo?.cpuCores ?? null,
    standalone: deviceInfo?.standalone ?? null,
  }
}

export function buildOwnerDeviceSignature(userAgent?: string | null, deviceInfo?: unknown) {
  const safeDeviceInfo = sanitizeDeviceInfo(deviceInfo)
  if (!safeDeviceInfo) return null

  const source = buildDeviceSignatureSource(userAgent, safeDeviceInfo)
  const digest = createHash('sha256').update(JSON.stringify(source)).digest('hex')
  return `device_${digest}`
}

export function enrichDeviceInfoWithSignature(userAgent?: string | null, deviceInfo?: unknown) {
  const safeDeviceInfo = sanitizeDeviceInfo(deviceInfo)
  if (!safeDeviceInfo) return null

  const signature = buildOwnerDeviceSignature(userAgent, safeDeviceInfo)
  return signature
    ? ({
        ...safeDeviceInfo,
        signature,
      } as DeviceInfoPayload & { signature: string })
    : safeDeviceInfo
}

export function extractStoredDeviceSignature(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const signature = (value as Record<string, unknown>).signature
  return typeof signature === 'string' && signature.trim() ? signature.trim() : null
}

export function invalidateOwnerTrafficRulesCache() {
  ownerRulesCache = null
}

export function matchOwnerTraffic(input: MatchInput, rules: OwnerTrafficRules): MatchResult {
  const ipAddress = input.ipAddress?.trim() || ''
  const normalizedIp = ipAddress
  const deviceSignature =
    extractStoredDeviceSignature(input.deviceInfo) || buildOwnerDeviceSignature(input.userAgent, input.deviceInfo)
  const deviceLabel = buildOwnerDeviceLabel(input.userAgent, input.deviceInfo)

  const matchedByIp = Boolean(normalizedIp) && rules.ips.includes(normalizedIp)
  const matchedByDevice = deviceSignature ? rules.devices.includes(deviceSignature) : false

  return {
    matched: matchedByIp || matchedByDevice,
    matchedByIp,
    matchedByDevice,
    deviceLabel,
    deviceSignature,
  }
}

export async function inspectAnalyticsTraffic(
  req: NextRequest,
  options: {
    deviceInfo?: unknown
  } = {},
): Promise<TrafficInspection> {
  const ipAddress = getClientIpFromHeaders(req.headers)
  const userAgent = req.headers.get('user-agent') || ''
  const adminTraffic = await isAdminTrafficRequest(req)

  if (adminTraffic) {
    return {
      ipAddress,
      userAgent,
      skipped: true,
      reason: 'admin',
      matched: true,
      matchedByIp: false,
      matchedByDevice: false,
      deviceLabel: buildOwnerDeviceLabel(userAgent, options.deviceInfo),
      deviceSignature: buildOwnerDeviceSignature(userAgent, options.deviceInfo),
    }
  }

  const rules = await getOwnerTrafficRules()
  const matched = matchOwnerTraffic(
    {
      ipAddress,
      userAgent,
      deviceInfo: options.deviceInfo,
    },
    rules,
  )

  return {
    ipAddress,
    userAgent,
    skipped: matched.matched,
    reason: matched.matched ? 'owner_allowlist' : null,
    ...matched,
  }
}

export function buildOwnerTrafficExcludeSql(options: {
  ipColumn: string
  deviceSignatureSql?: string
  rules: OwnerTrafficRules
}) {
  const conditions: Prisma.Sql[] = []

  if (options.rules.ips.length > 0) {
    conditions.push(
      Prisma.sql`COALESCE(NULLIF(${Prisma.raw(options.ipColumn)}, ''), '') NOT IN (${Prisma.join(options.rules.ips)})`,
    )
  }

  if (options.rules.devices.length > 0) {
    const signatureSql = Prisma.raw(options.deviceSignatureSql || "''")
    conditions.push(
      Prisma.sql`COALESCE(${signatureSql}, '') NOT IN (${Prisma.join(options.rules.devices)})`,
    )
  }

  if (conditions.length === 0) {
    return Prisma.empty
  }

  const [firstCondition, ...restConditions] = conditions
  const combinedConditions = restConditions.reduce(
    (sql, condition) => Prisma.sql`${sql} AND ${condition}`,
    firstCondition,
  )

  return Prisma.sql`AND (${combinedConditions})`
}
