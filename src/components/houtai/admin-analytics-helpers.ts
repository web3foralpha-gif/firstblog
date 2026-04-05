import { Prisma } from '@prisma/client'

import { parseUserAgent, sanitizeDeviceInfo } from '@/lib/device-info'
import type { TimelinePoint } from '@/components/houtai/admin-analytics-ui'

export type RangeKey = '24h' | '7d' | '30d' | 'all'
export type DeviceFilterKey = 'all' | 'mobile' | 'desktop' | 'tablet' | 'bot' | 'other'
export type SelfFilterKey = 'hide' | 'show'
export type AnalyticsTabKey = 'overview' | 'mascot' | 'content' | 'visitors'

export const RANGE_OPTIONS: Array<{ key: RangeKey; label: string; hours?: number }> = [
  { key: '24h', label: '24 小时', hours: 24 },
  { key: '7d', label: '7 天', hours: 24 * 7 },
  { key: '30d', label: '30 天', hours: 24 * 30 },
  { key: 'all', label: '全部历史' },
]

export const DEVICE_OPTIONS: Array<{ key: DeviceFilterKey; label: string }> = [
  { key: 'all', label: '全部设备' },
  { key: 'mobile', label: '手机' },
  { key: 'desktop', label: '桌面' },
  { key: 'tablet', label: '平板' },
  { key: 'bot', label: '爬虫' },
  { key: 'other', label: '其他' },
]

export const ANALYTICS_TABS: Array<{ key: AnalyticsTabKey; label: string; description: string }> = [
  { key: 'overview', label: '总览', description: '先看整体质量和核心结论' },
  { key: 'mascot', label: '数字分身', description: '单独看 AI 聊天与异常' },
  { key: 'content', label: '内容转化', description: '聚焦文章表现和互动' },
  { key: 'visitors', label: '访客明细', description: '查看 IP、设备和访问轨迹' },
]

export const ACCESS_STYLES: Record<string, string> = {
  PUBLIC: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  PASSWORD: 'border-violet-200 bg-violet-50 text-violet-700',
  PAID: 'border-amber-200 bg-amber-50 text-amber-700',
}

export const ACCESS_LABELS: Record<string, string> = {
  PUBLIC: '公开',
  PASSWORD: '加密',
  PAID: '付费',
}

export const INTERACTION_TONES: Record<string, string> = {
  VIEW_QUALIFIED: 'border-sky-200 bg-sky-50 text-sky-700',
  LIKE: 'border-rose-200 bg-rose-50 text-rose-700',
  SHARE_LINK: 'border-amber-200 bg-amber-50 text-amber-700',
  SHARE_IMAGE: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700',
  COMMENT_SUBMIT: 'border-emerald-200 bg-emerald-50 text-emerald-700',
}

export const RECENT_VISIT_GROUP_WINDOW_MS = 30 * 60 * 1000
export const RECENT_INTERACTION_GROUP_WINDOW_MS = 45 * 60 * 1000
export const ANALYTICS_TIMEZONE = 'Asia/Shanghai'

export function resolveRange(rangeParam?: string | string[]): { key: RangeKey; from: Date | null } {
  const raw = Array.isArray(rangeParam) ? rangeParam[0] : rangeParam
  const matched = RANGE_OPTIONS.find(option => option.key === raw) ?? RANGE_OPTIONS[1]

  return {
    key: matched.key,
    from: matched.hours ? new Date(Date.now() - matched.hours * 60 * 60 * 1000) : null,
  }
}

export function resolveDeviceFilter(deviceParam?: string | string[]): DeviceFilterKey {
  const raw = Array.isArray(deviceParam) ? deviceParam[0] : deviceParam
  return DEVICE_OPTIONS.find(option => option.key === raw)?.key ?? 'all'
}

export function resolveIpFilter(ipParam?: string | string[]) {
  const raw = Array.isArray(ipParam) ? ipParam[0] : ipParam
  const value = raw?.trim()
  return value ? value.slice(0, 120) : null
}

export function resolveSelfFilter(selfParam?: string | string[]): SelfFilterKey {
  const raw = Array.isArray(selfParam) ? selfParam[0] : selfParam
  return raw === 'show' ? 'show' : 'hide'
}

export function resolveTab(tabParam?: string | string[]): AnalyticsTabKey {
  const raw = Array.isArray(tabParam) ? tabParam[0] : tabParam
  return ANALYTICS_TABS.find(option => option.key === raw)?.key ?? 'overview'
}

export function buildAnalyticsHref(
  rangeKey: RangeKey,
  deviceKey: DeviceFilterKey,
  ipAddress?: string | null,
  selfKey: SelfFilterKey = 'hide',
  tabKey: AnalyticsTabKey = 'overview',
) {
  const params = new URLSearchParams()
  if (rangeKey !== '7d') params.set('range', rangeKey)
  if (deviceKey !== 'all') params.set('device', deviceKey)
  if (ipAddress) params.set('ip', ipAddress)
  if (selfKey === 'show') params.set('self', 'show')
  if (tabKey !== 'overview') params.set('tab', tabKey)
  const query = params.toString()
  return query ? `/houtai/analytics?${query}` : '/houtai/analytics'
}

export function buildDeviceFilterSql(columnName: string, deviceKey: DeviceFilterKey) {
  if (deviceKey === 'all') return Prisma.empty

  const ua = `LOWER(COALESCE(${columnName}, ''))`
  const bot = `${ua} ~ '(bot|crawler|spider|slurp|curl|wget|python-requests|headlesschrome|postmanruntime|insomnia)'`
  const mobile = `${ua} ~ '(iphone|mobile|phone|android.+mobile|windows phone|iemobile)'`
  const tablet = `${ua} ~ '(ipad|tablet|nexus 7|nexus 9|sm-t|kf[a-z]{2}wi)' OR (${ua} ~ 'android' AND ${ua} !~ 'mobile')`
  const desktop = `${ua} ~ '(windows nt|macintosh|cros|linux x86_64|x11)'`

  switch (deviceKey) {
    case 'mobile':
      return Prisma.raw(`AND (${mobile}) AND NOT (${bot})`)
    case 'tablet':
      return Prisma.raw(`AND (${tablet}) AND NOT (${bot})`)
    case 'desktop':
      return Prisma.raw(`AND (${desktop}) AND NOT (${bot})`)
    case 'bot':
      return Prisma.raw(`AND (${bot})`)
    case 'other':
      return Prisma.raw(`AND (${ua} <> '' AND NOT (${bot}) AND NOT (${mobile}) AND NOT (${tablet}) AND NOT (${desktop}))`)
    default:
      return Prisma.empty
  }
}

export function buildIpFilterSql(columnName: string, ipAddress: string | null) {
  if (!ipAddress) return Prisma.empty
  if (ipAddress === '未知 IP') {
    return Prisma.raw(`AND (${columnName} IS NULL OR ${columnName} = '')`)
  }
  return Prisma.sql`AND ${Prisma.raw(columnName)} = ${ipAddress}`
}

export function buildTimeBucketSql(columnName: string, rangeKey: RangeKey) {
  const bucketUnit = rangeKey === '24h' ? 'hour' : 'day'
  return Prisma.raw(`date_trunc('${bucketUnit}', timezone('${ANALYTICS_TIMEZONE}', ${columnName}))`)
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat('zh-CN').format(Math.round(value))
}

export function formatPercent(numerator: number, denominator: number) {
  if (!denominator) return '—'
  const value = (numerator / denominator) * 100
  return `${new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits: value >= 10 ? 0 : 1,
  }).format(value)}%`
}

export function formatDuration(seconds: number | null | undefined) {
  if (!seconds || seconds <= 0) return '—'

  const rounded = Math.round(seconds)
  if (rounded < 60) return `${rounded} 秒`
  if (rounded < 3600) {
    const minutes = Math.floor(rounded / 60)
    const remainSeconds = rounded % 60
    return remainSeconds ? `${minutes} 分 ${remainSeconds} 秒` : `${minutes} 分钟`
  }

  const hours = Math.floor(rounded / 3600)
  const minutes = Math.floor((rounded % 3600) / 60)
  return minutes ? `${hours} 小时 ${minutes} 分` : `${hours} 小时`
}

export function formatLatency(latencyMs: number | null | undefined) {
  if (!latencyMs || latencyMs <= 0) return '—'
  if (latencyMs < 1000) return `${Math.round(latencyMs)} ms`
  return `${(latencyMs / 1000).toFixed(latencyMs >= 10_000 ? 0 : 1)} 秒`
}

export function formatIpAddress(ipAddress: string | null | undefined) {
  return ipAddress?.trim() || '未知 IP'
}

export function formatDecimal(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—'
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(Number(value))
}

export function formatLocation(region?: string | null, city?: string | null) {
  const parts = [region, city].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : '地区待识别'
}

export function normalizeReferrer(referrer: string) {
  if (!referrer) return '直接访问'

  try {
    const url = new URL(referrer)
    return url.hostname.replace(/^www\./, '') || '直接访问'
  } catch {
    const normalized = referrer.replace(/^https?:\/\//, '').split('/')[0]?.trim()
    return normalized || '其他来源'
  }
}

export function truncateText(value: string | null | undefined, maxLength: number) {
  if (!value) return ''
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trim()}…`
}

export function extractMetadataDeviceInfo(metadata: Prisma.JsonValue | null | undefined) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null
  const deviceInfo = (metadata as Record<string, unknown>).deviceInfo
  return deviceInfo && typeof deviceInfo === 'object' && !Array.isArray(deviceInfo)
    ? (deviceInfo as Record<string, unknown>)
    : null
}

export function extractMetadataDevicePayload(metadata: Prisma.JsonValue | null | undefined) {
  return sanitizeDeviceInfo(extractMetadataDeviceInfo(metadata))
}

export function matchesDeviceFilter(userAgent: string | null | undefined, deviceKey: DeviceFilterKey) {
  if (deviceKey === 'all') return true
  return parseUserAgent(userAgent).type === deviceKey
}

export function matchesIpFilter(ipAddress: string | null | undefined, selectedIp: string | null) {
  if (!selectedIp) return true
  if (selectedIp === '未知 IP') {
    return !ipAddress?.trim()
  }
  return (ipAddress || '').trim() === selectedIp
}

export function safeDecode(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export function prettifyPath(path: string, titleBySlug: Map<string, string>) {
  if (path === '/') return '首页'
  if (path === '/blog') return '博客列表'
  if (path === '/about') return '关于页'
  if (path === '/guestbook') return '留言页'
  if (path === '/friends') return '友链页'
  if (path === '/rss.xml') return 'RSS 订阅'

  if (path.startsWith('/article/') || (path.startsWith('/blog/') && path !== '/blog')) {
    const slug = safeDecode(path.split('/').filter(Boolean)[1] || '')
    const title = titleBySlug.get(slug)
    if (title) return `${path.startsWith('/article/') ? '文章' : '博客'} · ${title}`
    return `${path.startsWith('/article/') ? '文章' : '博客'} · ${slug || path}`
  }

  return path
}

export function getInteractionLabel(type: string) {
  switch (type) {
    case 'VIEW_QUALIFIED':
      return '有效阅读'
    case 'LIKE':
      return '点赞'
    case 'SHARE_LINK':
      return '复制链接'
    case 'SHARE_IMAGE':
      return '海报转发'
    case 'COMMENT_SUBMIT':
      return '评论提交'
    default:
      return type
  }
}

export function getInteractionTone(type: string) {
  return INTERACTION_TONES[type] ?? 'border-slate-200 bg-slate-50 text-slate-600'
}

export function getMascotErrorLabel(errorType: string | null | undefined) {
  switch (errorType) {
    case 'auth':
      return '鉴权失败'
    case 'rate_limit':
      return '限流'
    case 'insufficient_balance':
      return '余额不足'
    case 'network':
      return '网络异常'
    case 'empty_reply':
      return '空回复'
    case 'provider_server':
      return '模型服务异常'
    case 'provider_error':
      return '模型返回异常'
    case 'disabled':
      return 'AI 已关闭'
    case 'missing_api_key':
      return '缺少 API Key'
    default:
      return '其他异常'
  }
}

export function toTimestamp(value: Date | string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 0 : date.getTime()
}

export function getRangeBucketStep(rangeKey: RangeKey) {
  return rangeKey === '24h' ? 'hour' : 'day'
}

export function startOfBucket(date: Date, rangeKey: RangeKey) {
  const next = new Date(date)
  if (rangeKey === '24h') {
    next.setMinutes(0, 0, 0)
  } else {
    next.setHours(0, 0, 0, 0)
  }
  return next
}

export function addBucket(date: Date, rangeKey: RangeKey) {
  const next = new Date(date)
  if (rangeKey === '24h') {
    next.setHours(next.getHours() + 1)
  } else {
    next.setDate(next.getDate() + 1)
  }
  return next
}

export function formatTrendShortLabel(date: Date, rangeKey: RangeKey) {
  if (rangeKey === '24h') {
    return new Intl.DateTimeFormat('zh-CN', { hour: '2-digit' }).format(date)
  }
  return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' }).format(date)
}

export function formatTrendLabel(date: Date, rangeKey: RangeKey) {
  if (rangeKey === '24h') {
    return new Intl.DateTimeFormat('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).format(date)
}

export function buildTimelinePoints(
  rows: Array<{ bucket: Date | string; value: number }>,
  rangeKey: RangeKey,
  now: Date,
  from: Date | null,
) {
  const sortedRows = rows
    .map(row => ({ bucket: new Date(row.bucket), value: Number(row.value ?? 0) }))
    .filter(row => !Number.isNaN(row.bucket.getTime()))
    .sort((left, right) => left.bucket.getTime() - right.bucket.getTime())

  const rowMap = new Map<string, number>()
  for (const row of sortedRows) {
    rowMap.set(startOfBucket(row.bucket, rangeKey).toISOString(), row.value)
  }

  const points: TimelinePoint[] = []

  if (from) {
    let cursor = startOfBucket(from, rangeKey)
    const limit = rangeKey === '24h' ? 30 : rangeKey === '7d' ? 10 : 40
    let guard = 0
    while (cursor.getTime() <= now.getTime() && guard < limit) {
      const value = rowMap.get(cursor.toISOString()) ?? 0
      points.push({
        key: cursor.toISOString(),
        label: formatTrendLabel(cursor, rangeKey),
        shortLabel: formatTrendShortLabel(cursor, rangeKey),
        value,
      })
      cursor = addBucket(cursor, rangeKey)
      guard += 1
    }
    return points
  }

  return sortedRows.slice(-30).map(row => ({
    key: row.bucket.toISOString(),
    label: formatTrendLabel(row.bucket, rangeKey),
    shortLabel: formatTrendShortLabel(row.bucket, rangeKey),
    value: row.value,
  }))
}

export function groupRecentVisits<
  T extends {
    sessionId: string
    path: string
    enteredAt: Date | string
    duration: number | null
    displayIp: string
    displayReferrer: string
    deviceProfile: { summary: string }
  },
>(items: T[]) {
  const groups: Array<T & { mergedCount: number; mergedDuration: number | null }> = []

  for (const item of items) {
    const last = groups[groups.length - 1]
    const sameKey =
      last &&
      last.sessionId === item.sessionId &&
      last.path === item.path &&
      last.displayIp === item.displayIp &&
      last.displayReferrer === item.displayReferrer &&
      last.deviceProfile.summary === item.deviceProfile.summary
    const closeEnough =
      last && Math.abs(toTimestamp(last.enteredAt) - toTimestamp(item.enteredAt)) <= RECENT_VISIT_GROUP_WINDOW_MS

    if (sameKey && closeEnough) {
      last.mergedCount += 1
      if ((item.duration ?? 0) > (last.mergedDuration ?? 0)) {
        last.mergedDuration = item.duration
      }
      continue
    }

    groups.push({
      ...item,
      mergedCount: 1,
      mergedDuration: item.duration,
    })
  }

  return groups
}

export function groupRecentInteractions<
  T extends {
    articleId: string
    type: string
    channel: string | null
    createdAt: Date | string
    ipAddress: string | null
    sessionId: string | null
  },
>(items: T[]) {
  const groups: Array<T & { mergedCount: number }> = []

  for (const item of items) {
    const last = groups[groups.length - 1]
    const sameKey =
      last &&
      last.articleId === item.articleId &&
      last.type === item.type &&
      (last.channel || '') === (item.channel || '') &&
      (last.sessionId || '') === (item.sessionId || '') &&
      (last.ipAddress || '') === (item.ipAddress || '')
    const closeEnough =
      last && Math.abs(toTimestamp(last.createdAt) - toTimestamp(item.createdAt)) <= RECENT_INTERACTION_GROUP_WINDOW_MS

    if (sameKey && closeEnough) {
      last.mergedCount += 1
      continue
    }

    groups.push({
      ...item,
      mergedCount: 1,
    })
  }

  return groups
}

