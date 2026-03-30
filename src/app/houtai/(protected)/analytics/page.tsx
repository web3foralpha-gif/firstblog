import Link from 'next/link'
import { headers } from 'next/headers'
import { Prisma } from '@prisma/client'

import {
  buildOwnerTrafficExcludeSql,
  getClientIpFromHeaders,
  getOwnerTrafficRules,
  matchOwnerTraffic,
} from '@/lib/analytics-traffic'
import { describeDevice, parseUserAgent, sanitizeDeviceInfo } from '@/lib/device-info'
import { prisma } from '@/lib/prisma'
import { formatDateTime } from '@/lib/utils'
import OwnerDeviceAllowlistButton from '@/components/houtai/OwnerDeviceAllowlistButton'

export const dynamic = 'force-dynamic'

type RangeKey = '24h' | '7d' | '30d' | 'all'
type DeviceFilterKey = 'all' | 'mobile' | 'desktop' | 'tablet' | 'bot' | 'other'
type SelfFilterKey = 'hide' | 'show'

type PageProps = {
  searchParams: Promise<{ range?: string | string[]; device?: string | string[]; ip?: string | string[]; self?: string | string[] }>
}

type SiteMetricsRow = {
  pv: number
  uv: number
  uniqueIp: number
  articlePv: number
  directPv: number
  externalPv: number
  avgDuration: number | null
  articleAvgDuration: number | null
}

type TopPageRow = {
  path: string
  views: number
  avgDuration: number | null
}

type ReferrerRow = {
  referrer: string
  views: number
}

type InteractionTotalsRow = {
  articleEnter: number
  qualifiedRead: number
  likes: number
  shares: number
  comments: number
  interactions: number
}

type ArticlePerformanceRow = {
  articleId: string
  enters: number
  qualified: number
  likes: number
  shareLink: number
  shareImage: number
  comments: number
  visitors: number
}

type TopIpRow = {
  ipAddress: string | null
  ipRegion: string | null
  ipCity: string | null
  views: number
  sessions: number
  lastSeen: Date | string
  userAgent: string | null
}

type RecentVisitRow = {
  id: string
  sessionId: string
  path: string
  enteredAt: Date | string
  duration: number | null
  ipAddress: string | null
  ipRegion: string | null
  ipCity: string | null
  referrer: string | null
  userAgent: string | null
  deviceInfo: Prisma.JsonValue | null
}

type UserAgentAggregateRow = {
  userAgent: string | null
  views: number
}

type IpTraceRow = {
  id: string
  sessionId: string
  path: string
  enteredAt: Date | string
  duration: number | null
  referrer: string | null
  userAgent: string | null
  deviceInfo: Prisma.JsonValue | null
}

type RankItem = {
  label: string
  value: number
  meta?: string
  href?: string
  highlighted?: boolean
}

const RANGE_OPTIONS: Array<{ key: RangeKey; label: string; hours?: number }> = [
  { key: '24h', label: '24 小时', hours: 24 },
  { key: '7d', label: '7 天', hours: 24 * 7 },
  { key: '30d', label: '30 天', hours: 24 * 30 },
  { key: 'all', label: '全部历史' },
]

const DEVICE_OPTIONS: Array<{ key: DeviceFilterKey; label: string }> = [
  { key: 'all', label: '全部设备' },
  { key: 'mobile', label: '手机' },
  { key: 'desktop', label: '桌面' },
  { key: 'tablet', label: '平板' },
  { key: 'bot', label: '爬虫' },
  { key: 'other', label: '其他' },
]

const ACCESS_STYLES: Record<string, string> = {
  PUBLIC: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  PASSWORD: 'border-violet-200 bg-violet-50 text-violet-700',
  PAID: 'border-amber-200 bg-amber-50 text-amber-700',
}

const ACCESS_LABELS: Record<string, string> = {
  PUBLIC: '公开',
  PASSWORD: '加密',
  PAID: '付费',
}

const INTERACTION_TONES: Record<string, string> = {
  VIEW_QUALIFIED: 'border-sky-200 bg-sky-50 text-sky-700',
  LIKE: 'border-rose-200 bg-rose-50 text-rose-700',
  SHARE_LINK: 'border-amber-200 bg-amber-50 text-amber-700',
  SHARE_IMAGE: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700',
  COMMENT_SUBMIT: 'border-emerald-200 bg-emerald-50 text-emerald-700',
}

const RECENT_VISIT_GROUP_WINDOW_MS = 30 * 60 * 1000
const RECENT_INTERACTION_GROUP_WINDOW_MS = 45 * 60 * 1000

function resolveRange(rangeParam?: string | string[]): { key: RangeKey; from: Date | null } {
  const raw = Array.isArray(rangeParam) ? rangeParam[0] : rangeParam
  const matched = RANGE_OPTIONS.find(option => option.key === raw) ?? RANGE_OPTIONS[1]

  return {
    key: matched.key,
    from: matched.hours ? new Date(Date.now() - matched.hours * 60 * 60 * 1000) : null,
  }
}

function resolveDeviceFilter(deviceParam?: string | string[]): DeviceFilterKey {
  const raw = Array.isArray(deviceParam) ? deviceParam[0] : deviceParam
  return DEVICE_OPTIONS.find(option => option.key === raw)?.key ?? 'all'
}

function resolveIpFilter(ipParam?: string | string[]) {
  const raw = Array.isArray(ipParam) ? ipParam[0] : ipParam
  const value = raw?.trim()
  return value ? value.slice(0, 120) : null
}

function resolveSelfFilter(selfParam?: string | string[]): SelfFilterKey {
  const raw = Array.isArray(selfParam) ? selfParam[0] : selfParam
  return raw === 'show' ? 'show' : 'hide'
}

function buildAnalyticsHref(
  rangeKey: RangeKey,
  deviceKey: DeviceFilterKey,
  ipAddress?: string | null,
  selfKey: SelfFilterKey = 'hide',
) {
  const params = new URLSearchParams()
  if (rangeKey !== '7d') params.set('range', rangeKey)
  if (deviceKey !== 'all') params.set('device', deviceKey)
  if (ipAddress) params.set('ip', ipAddress)
  if (selfKey === 'show') params.set('self', 'show')
  const query = params.toString()
  return query ? `/houtai/analytics?${query}` : '/houtai/analytics'
}

function buildDeviceFilterSql(columnName: string, deviceKey: DeviceFilterKey) {
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

function buildIpFilterSql(columnName: string, ipAddress: string | null) {
  if (!ipAddress) return Prisma.empty
  if (ipAddress === '未知 IP') {
    return Prisma.raw(`AND (${columnName} IS NULL OR ${columnName} = '')`)
  }
  return Prisma.sql`AND ${Prisma.raw(columnName)} = ${ipAddress}`
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('zh-CN').format(Math.round(value))
}

function formatPercent(numerator: number, denominator: number) {
  if (!denominator) return '—'
  const value = (numerator / denominator) * 100
  return `${new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits: value >= 10 ? 0 : 1,
  }).format(value)}%`
}

function formatDuration(seconds: number | null | undefined) {
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

function formatIpAddress(ipAddress: string | null | undefined) {
  return ipAddress?.trim() || '未知 IP'
}

function formatLocation(region?: string | null, city?: string | null) {
  const parts = [region, city].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : '地区待识别'
}

function normalizeReferrer(referrer: string) {
  if (!referrer) return '直接访问'

  try {
    const url = new URL(referrer)
    return url.hostname.replace(/^www\./, '') || '直接访问'
  } catch {
    const normalized = referrer.replace(/^https?:\/\//, '').split('/')[0]?.trim()
    return normalized || '其他来源'
  }
}

function extractMetadataDeviceInfo(metadata: Prisma.JsonValue | null | undefined) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null
  const deviceInfo = (metadata as Record<string, unknown>).deviceInfo
  return deviceInfo && typeof deviceInfo === 'object' && !Array.isArray(deviceInfo)
    ? (deviceInfo as Record<string, unknown>)
    : null
}

function extractMetadataDevicePayload(metadata: Prisma.JsonValue | null | undefined) {
  return sanitizeDeviceInfo(extractMetadataDeviceInfo(metadata))
}

function matchesDeviceFilter(userAgent: string | null | undefined, deviceKey: DeviceFilterKey) {
  if (deviceKey === 'all') return true
  return parseUserAgent(userAgent).type === deviceKey
}

function matchesIpFilter(ipAddress: string | null | undefined, selectedIp: string | null) {
  if (!selectedIp) return true
  if (selectedIp === '未知 IP') {
    return !ipAddress?.trim()
  }
  return (ipAddress || '').trim() === selectedIp
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function prettifyPath(path: string, titleBySlug: Map<string, string>) {
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

function getInteractionLabel(type: string) {
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

function getInteractionTone(type: string) {
  return INTERACTION_TONES[type] ?? 'border-slate-200 bg-slate-50 text-slate-600'
}

function toTimestamp(value: Date | string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 0 : date.getTime()
}

function groupRecentVisits<
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

function groupRecentInteractions<
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

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-[28px] border border-slate-200 bg-white shadow-sm ${className}`}>{children}</section>
}

function MetricCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{note}</p>
    </div>
  )
}

function CompactStat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-800">{value}</p>
      {note ? <p className="mt-1 text-xs text-slate-400">{note}</p> : null}
    </div>
  )
}

function FilterChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-600">
      <span className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  )
}

function RankListCard({ title, items }: { title: string; items: RankItem[] }) {
  return (
    <SectionCard>
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      </div>
      <div className="divide-y divide-slate-100">
        {items.length === 0 ? (
          <p className="px-5 py-10 text-sm text-slate-400">暂无数据</p>
        ) : (
          items.map((item, index) => {
            const content = (
              <>
                <div className="flex min-w-0 items-start gap-3">
                  <span className="inline-flex h-7 w-7 flex-none items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{item.label}</p>
                    {item.meta ? <p className="mt-1 text-xs text-slate-400">{item.meta}</p> : null}
                  </div>
                </div>
                <p className="ml-4 text-lg font-semibold text-slate-800">{formatNumber(item.value)}</p>
              </>
            )

            return item.href ? (
              <Link
                key={`${item.label}-${index}`}
                href={item.href}
                target={item.href.startsWith('/houtai') ? undefined : '_blank'}
                className={`flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-slate-50 ${
                  item.highlighted ? 'bg-amber-50/70' : ''
                }`}
              >
                {content}
              </Link>
            ) : (
              <div
                key={`${item.label}-${index}`}
                className={`flex items-center justify-between gap-4 px-5 py-4 ${item.highlighted ? 'bg-amber-50/70' : ''}`}
              >
                {content}
              </div>
            )
          })
        )}
      </div>
    </SectionCard>
  )
}

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const { range, device, ip, self } = await searchParams
  const now = new Date()
  const requestHeaders = await headers()
  const rangeState = resolveRange(range)
  const deviceState = resolveDeviceFilter(device)
  const selectedIp = resolveIpFilter(ip)
  const selfState = resolveSelfFilter(self)
  const currentVisitorIp = getClientIpFromHeaders(requestHeaders)
  const ownerTrafficRules = await getOwnerTrafficRules()
  const currentUserAgent = requestHeaders.get('user-agent') || ''
  const shouldHideCurrentVisitor =
    Boolean(currentVisitorIp) &&
    selfState === 'hide' &&
    (!selectedIp || selectedIp !== currentVisitorIp)

  const pageViewDeviceSql = buildDeviceFilterSql('"userAgent"', deviceState)
  const interactionDeviceSql = buildDeviceFilterSql('"userAgent"', deviceState)
  const pageViewIpSql = buildIpFilterSql('"ipAddress"', selectedIp)
  const interactionIpSql = buildIpFilterSql('"ipAddress"', selectedIp)
  const ownerPageViewSql = buildOwnerTrafficExcludeSql({
    ipColumn: '"ipAddress"',
    deviceSignatureSql: `"deviceInfo"->>'signature'`,
    rules: ownerTrafficRules,
  })
  const ownerInteractionSql = buildOwnerTrafficExcludeSql({
    ipColumn: '"ipAddress"',
    deviceSignatureSql: `"metadata"->'deviceInfo'->>'signature'`,
    rules: ownerTrafficRules,
  })
  const pageViewSelfSql = shouldHideCurrentVisitor && currentVisitorIp
    ? Prisma.sql`AND COALESCE(NULLIF("ipAddress", ''), '') <> ${currentVisitorIp}`
    : Prisma.empty
  const interactionSelfSql = shouldHideCurrentVisitor && currentVisitorIp
    ? Prisma.sql`AND COALESCE(NULLIF("ipAddress", ''), '') <> ${currentVisitorIp}`
    : Prisma.empty

  const pageViewBaseSql = Prisma.sql`
    FROM "PageView"
    WHERE NOT (
      "articleId" IS NULL
      AND (
        "path" LIKE '/article/%'
        OR ("path" LIKE '/blog/%' AND "path" <> '/blog')
      )
    )
    ${rangeState.from ? Prisma.sql`AND "enteredAt" >= ${rangeState.from}` : Prisma.empty}
    ${pageViewDeviceSql}
    ${pageViewIpSql}
    ${ownerPageViewSql}
    ${pageViewSelfSql}
  `

  const interactionBaseSql = Prisma.sql`
    FROM "ArticleInteraction"
    WHERE 1 = 1
    ${rangeState.from ? Prisma.sql`AND "createdAt" >= ${rangeState.from}` : Prisma.empty}
    ${interactionDeviceSql}
    ${interactionIpSql}
    ${ownerInteractionSql}
    ${interactionSelfSql}
  `

  const recentInteractionNotFilters: Prisma.ArticleInteractionWhereInput[] = []
  if (ownerTrafficRules.ips.length > 0) {
    recentInteractionNotFilters.push({ ipAddress: { in: ownerTrafficRules.ips } })
  }
  if (shouldHideCurrentVisitor && currentVisitorIp) {
    recentInteractionNotFilters.push({ ipAddress: currentVisitorIp })
  }

  const recentInteractionWhere: Prisma.ArticleInteractionWhereInput = {
    ...(rangeState.from ? { createdAt: { gte: rangeState.from } } : {}),
    type: { in: ['VIEW_QUALIFIED', 'LIKE', 'SHARE_LINK', 'SHARE_IMAGE', 'COMMENT_SUBMIT'] },
    ...(recentInteractionNotFilters.length > 0 ? { NOT: recentInteractionNotFilters } : {}),
    ...(selectedIp
      ? selectedIp === '未知 IP'
        ? { OR: [{ ipAddress: null }, { ipAddress: '' }] }
        : { ipAddress: selectedIp }
      : {}),
  }

  const [siteMetricsResult, topPagesRaw, rawReferrers, interactionTotalsResult, articlePerformanceRaw, topIpsRaw, recentVisitsRaw, userAgentGroupsRaw, ipTraceRaw, recentInteractionsRaw] =
    await Promise.all([
      prisma.$queryRaw<SiteMetricsRow[]>(Prisma.sql`
        SELECT
          COUNT(*)::int AS "pv",
          COUNT(DISTINCT COALESCE(NULLIF("visitorId", ''), "sessionId"))::int AS "uv",
          COUNT(DISTINCT NULLIF("ipAddress", ''))::int AS "uniqueIp",
          COUNT(*) FILTER (WHERE "articleId" IS NOT NULL)::int AS "articlePv",
          COUNT(*) FILTER (WHERE "referrer" IS NULL OR "referrer" = '')::int AS "directPv",
          COUNT(*) FILTER (
            WHERE "referrer" IS NOT NULL
              AND "referrer" <> ''
              AND "referrer" NOT LIKE 'https://zb2026.top%'
              AND "referrer" NOT LIKE 'https://www.zb2026.top%'
              AND "referrer" NOT LIKE 'http://zb2026.top%'
              AND "referrer" NOT LIKE 'http://www.zb2026.top%'
          )::int AS "externalPv",
          COALESCE(AVG("duration") FILTER (WHERE "duration" IS NOT NULL), 0)::float AS "avgDuration",
          COALESCE(AVG("duration") FILTER (WHERE "duration" IS NOT NULL AND "articleId" IS NOT NULL), 0)::float AS "articleAvgDuration"
        ${pageViewBaseSql}
      `),
      prisma.$queryRaw<TopPageRow[]>(Prisma.sql`
        SELECT
          "path" AS "path",
          COUNT(*)::int AS "views",
          COALESCE(AVG("duration") FILTER (WHERE "duration" IS NOT NULL), 0)::float AS "avgDuration"
        ${pageViewBaseSql}
        GROUP BY "path"
        ORDER BY COUNT(*) DESC, MAX("enteredAt") DESC
        LIMIT 6
      `),
      prisma.$queryRaw<ReferrerRow[]>(Prisma.sql`
        SELECT
          COALESCE(NULLIF("referrer", ''), '') AS "referrer",
          COUNT(*)::int AS "views"
        ${pageViewBaseSql}
        GROUP BY 1
        ORDER BY 2 DESC
      `),
      prisma.$queryRaw<InteractionTotalsRow[]>(Prisma.sql`
        SELECT
          COUNT(*) FILTER (WHERE "type" = 'VIEW_ENTER')::int AS "articleEnter",
          COUNT(*) FILTER (WHERE "type" = 'VIEW_QUALIFIED')::int AS "qualifiedRead",
          COUNT(*) FILTER (WHERE "type" = 'LIKE')::int AS "likes",
          COUNT(*) FILTER (WHERE "type" IN ('SHARE_LINK', 'SHARE_IMAGE'))::int AS "shares",
          COUNT(*) FILTER (WHERE "type" = 'COMMENT_SUBMIT')::int AS "comments",
          COUNT(*) FILTER (WHERE "type" IN ('LIKE', 'SHARE_LINK', 'SHARE_IMAGE', 'COMMENT_SUBMIT'))::int AS "interactions"
        ${interactionBaseSql}
      `),
      prisma.$queryRaw<ArticlePerformanceRow[]>(Prisma.sql`
        SELECT *
        FROM (
          SELECT
            ai."articleId" AS "articleId",
            COUNT(*) FILTER (WHERE ai."type" = 'VIEW_ENTER')::int AS "enters",
            COUNT(*) FILTER (WHERE ai."type" = 'VIEW_QUALIFIED')::int AS "qualified",
            COUNT(*) FILTER (WHERE ai."type" = 'LIKE')::int AS "likes",
            COUNT(*) FILTER (WHERE ai."type" = 'SHARE_LINK')::int AS "shareLink",
            COUNT(*) FILTER (WHERE ai."type" = 'SHARE_IMAGE')::int AS "shareImage",
            COUNT(*) FILTER (WHERE ai."type" = 'COMMENT_SUBMIT')::int AS "comments",
            COUNT(DISTINCT COALESCE(NULLIF(ai."visitorId", ''), ai."sessionId"))::int AS "visitors"
          FROM "ArticleInteraction" ai
          WHERE 1 = 1
            ${rangeState.from ? Prisma.sql`AND ai."createdAt" >= ${rangeState.from}` : Prisma.empty}
            ${buildDeviceFilterSql('ai."userAgent"', deviceState)}
            ${buildIpFilterSql('ai."ipAddress"', selectedIp)}
          GROUP BY ai."articleId"
          HAVING COUNT(*) FILTER (
            WHERE ai."type" IN ('VIEW_ENTER', 'VIEW_QUALIFIED', 'LIKE', 'SHARE_LINK', 'SHARE_IMAGE', 'COMMENT_SUBMIT')
          ) > 0
        ) AS "articleStats"
        ORDER BY "qualified" DESC, "enters" DESC, ("likes" + "shareLink" + "shareImage" + "comments") DESC
        LIMIT 10
      `),
      prisma.$queryRaw<TopIpRow[]>(Prisma.sql`
        SELECT
          COALESCE(NULLIF("ipAddress", ''), '未知 IP') AS "ipAddress",
          MAX(NULLIF("ipRegion", '')) AS "ipRegion",
          MAX(NULLIF("ipCity", '')) AS "ipCity",
          COUNT(*)::int AS "views",
          COUNT(DISTINCT "sessionId")::int AS "sessions",
          MAX("enteredAt") AS "lastSeen",
          MAX(NULLIF("userAgent", '')) AS "userAgent"
        ${pageViewBaseSql}
        GROUP BY 1
        ORDER BY COUNT(*) DESC, MAX("enteredAt") DESC
        LIMIT 6
      `),
      prisma.$queryRaw<RecentVisitRow[]>(Prisma.sql`
        SELECT
          "id",
          "sessionId",
          "path",
          "enteredAt",
          "duration",
          "ipAddress",
          "ipRegion",
          "ipCity",
          "referrer",
          "userAgent",
          "deviceInfo"
        ${pageViewBaseSql}
        ORDER BY "enteredAt" DESC
        LIMIT 10
      `),
      prisma.$queryRaw<UserAgentAggregateRow[]>(Prisma.sql`
        SELECT
          COALESCE(NULLIF("userAgent", ''), '') AS "userAgent",
          COUNT(*)::int AS "views"
        ${pageViewBaseSql}
        GROUP BY 1
      `),
      selectedIp
        ? prisma.$queryRaw<IpTraceRow[]>(Prisma.sql`
            SELECT
              "id",
              "sessionId",
              "path",
              "enteredAt",
              "duration",
              "referrer",
              "userAgent",
              "deviceInfo"
            ${pageViewBaseSql}
            ORDER BY "enteredAt" DESC
            LIMIT 24
          `)
        : Promise.resolve([]),
      prisma.articleInteraction.findMany({
        where: recentInteractionWhere,
        orderBy: { createdAt: 'desc' },
        take: 120,
        select: {
          id: true,
          type: true,
          channel: true,
          sessionId: true,
          createdAt: true,
          ipAddress: true,
          ipRegion: true,
          ipCity: true,
          userAgent: true,
          metadata: true,
          path: true,
          articleId: true,
          article: {
            select: {
              title: true,
              slug: true,
              accessType: true,
            },
          },
        },
      }),
    ])

  const siteMetrics = siteMetricsResult[0] ?? {
    pv: 0,
    uv: 0,
    uniqueIp: 0,
    articlePv: 0,
    directPv: 0,
    externalPv: 0,
    avgDuration: 0,
    articleAvgDuration: 0,
  }

  const interactionTotals = interactionTotalsResult[0] ?? {
    articleEnter: 0,
    qualifiedRead: 0,
    likes: 0,
    shares: 0,
    comments: 0,
    interactions: 0,
  }

  const pathSlugs = Array.from(
    new Set(
      [...topPagesRaw, ...recentVisitsRaw]
        .map(item => {
          if (item.path.startsWith('/article/') || (item.path.startsWith('/blog/') && item.path !== '/blog')) {
            return safeDecode(item.path.split('/').filter(Boolean)[1] || '')
          }
          return null
        })
        .filter((slug): slug is string => Boolean(slug)),
    ),
  )

  const [pageArticles, rankedArticles] = await Promise.all([
    pathSlugs.length > 0
      ? prisma.article.findMany({
          where: { slug: { in: pathSlugs } },
          select: { slug: true, title: true },
        })
      : Promise.resolve([]),
    articlePerformanceRaw.length > 0
      ? prisma.article.findMany({
          where: { id: { in: articlePerformanceRaw.map(item => item.articleId) } },
          select: {
            id: true,
            title: true,
            accessType: true,
            published: true,
            updatedAt: true,
          },
        })
      : Promise.resolve([]),
  ])

  const titleBySlug = new Map(pageArticles.map(article => [article.slug, article.title]))
  const articleById = new Map(rankedArticles.map(article => [article.id, article]))

  const topPages: RankItem[] = topPagesRaw.map(item => ({
    label: prettifyPath(item.path, titleBySlug),
    value: Number(item.views ?? 0),
    meta: `平均停留 ${formatDuration(Number(item.avgDuration ?? 0))}`,
    href: item.path,
  }))

  const referrerMap = new Map<string, number>()
  for (const item of rawReferrers) {
    const key = normalizeReferrer(item.referrer)
    referrerMap.set(key, (referrerMap.get(key) ?? 0) + Number(item.views ?? 0))
  }

  const topReferrers: RankItem[] = Array.from(referrerMap.entries())
    .map(([label, value]) => ({
      label,
      value,
      meta: `占比 ${formatPercent(value, siteMetrics.pv)}`,
    }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 6)

  const deviceTypeMap = new Map<string, number>()
  const osMap = new Map<string, number>()
  const browserMap = new Map<string, number>()

  for (const item of userAgentGroupsRaw) {
    const views = Number(item.views ?? 0)
    if (!views) continue

    const parsed = parseUserAgent(item.userAgent)
    deviceTypeMap.set(parsed.typeLabel, (deviceTypeMap.get(parsed.typeLabel) ?? 0) + views)

    if (parsed.osLabel) {
      osMap.set(parsed.osLabel, (osMap.get(parsed.osLabel) ?? 0) + views)
    }

    if (parsed.browserLabel) {
      browserMap.set(parsed.browserLabel, (browserMap.get(parsed.browserLabel) ?? 0) + views)
    }
  }

  const topDeviceEntry = Array.from(deviceTypeMap.entries()).sort((left, right) => right[1] - left[1])[0]
  const topOsEntry = Array.from(osMap.entries()).sort((left, right) => right[1] - left[1])[0]
  const topBrowserEntry = Array.from(browserMap.entries()).sort((left, right) => right[1] - left[1])[0]

  const topBrowsers: RankItem[] = Array.from(browserMap.entries())
    .map(([label, value]) => ({
      label,
      value,
      meta: `占比 ${formatPercent(value, siteMetrics.pv)}`,
    }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 6)

  const topOperatingSystems: RankItem[] = Array.from(osMap.entries())
    .map(([label, value]) => ({
      label,
      value,
      meta: `占比 ${formatPercent(value, siteMetrics.pv)}`,
    }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 6)

  const deviceBreakdown: RankItem[] = Array.from(deviceTypeMap.entries())
    .map(([label, value]) => ({
      label,
      value,
      meta: `占比 ${formatPercent(value, siteMetrics.pv)}`,
    }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 6)

  const topIps: RankItem[] = topIpsRaw.map(item => ({
    label: formatIpAddress(item.ipAddress),
    value: Number(item.views ?? 0),
    meta: `${formatLocation(item.ipRegion, item.ipCity)} · ${describeDevice(item.userAgent).summary} · ${formatNumber(Number(item.sessions ?? 0))} 次会话`,
    href: buildAnalyticsHref(rangeState.key, deviceState, formatIpAddress(item.ipAddress), selfState),
    highlighted: Boolean(selectedIp && selectedIp === formatIpAddress(item.ipAddress)),
  }))

  const articleRows = articlePerformanceRaw.map(row => {
    const article = articleById.get(row.articleId)
    const shareCount = Number(row.shareLink ?? 0) + Number(row.shareImage ?? 0)
    const interactionCount = Number(row.likes ?? 0) + shareCount + Number(row.comments ?? 0)

    return {
      articleId: row.articleId,
      title: article?.title ?? '已删除文章',
      accessType: article?.accessType ?? 'PUBLIC',
      published: article?.published ?? false,
      updatedAt: article?.updatedAt ?? null,
      enters: Number(row.enters ?? 0),
      qualified: Number(row.qualified ?? 0),
      shareCount,
      comments: Number(row.comments ?? 0),
      likes: Number(row.likes ?? 0),
      interactionCount,
    }
  })

  const recentVisits = groupRecentVisits(
    recentVisitsRaw.map(item => ({
      ...item,
      displayPath: prettifyPath(item.path, titleBySlug),
      displayIp: formatIpAddress(item.ipAddress),
      displayLocation: formatLocation(item.ipRegion, item.ipCity),
      displayReferrer: normalizeReferrer(item.referrer || ''),
      deviceProfile: describeDevice(item.userAgent, sanitizeDeviceInfo(item.deviceInfo)),
      traceHref: buildAnalyticsHref(rangeState.key, deviceState, formatIpAddress(item.ipAddress), selfState),
    })),
  ).slice(0, 8)

  const recentInteractionRows = groupRecentInteractions(
    recentInteractionsRaw
      .filter(item => !matchOwnerTraffic({
        ipAddress: item.ipAddress,
        userAgent: item.userAgent,
        deviceInfo: extractMetadataDeviceInfo(item.metadata),
      }, ownerTrafficRules).matched)
      .filter(item => matchesDeviceFilter(item.userAgent, deviceState))
      .filter(item => matchesIpFilter(item.ipAddress, selectedIp))
      .map(item => ({
        ...item,
        deviceProfile: describeDevice(item.userAgent, extractMetadataDevicePayload(item.metadata)),
      })),
  ).slice(0, 10)

  const ipTraceRows = ipTraceRaw.map(item => ({
    ...item,
    displayPath: prettifyPath(item.path, titleBySlug),
    displayReferrer: normalizeReferrer(item.referrer || ''),
    deviceProfile: describeDevice(item.userAgent, sanitizeDeviceInfo(item.deviceInfo)),
  }))

  const rangeText = rangeState.from
    ? `${formatDateTime(rangeState.from)} - ${formatDateTime(now)}`
    : `全部历史（截止 ${formatDateTime(now)}）`
  const selectedRangeLabel = RANGE_OPTIONS.find(option => option.key === rangeState.key)?.label ?? '7 天'
  const selectedDeviceLabel = DEVICE_OPTIONS.find(option => option.key === deviceState)?.label ?? '全部设备'
  const directRate = formatPercent(siteMetrics.directPv, siteMetrics.pv)
  const externalRate = formatPercent(siteMetrics.externalPv, siteMetrics.pv)
  const interactionRate = formatPercent(interactionTotals.interactions, interactionTotals.articleEnter)
  const shareRate = formatPercent(interactionTotals.shares, interactionTotals.interactions)

  return (
    <div className="space-y-6">
      <SectionCard className="overflow-hidden">
        <div className="px-5 py-6 sm:px-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Analytics</p>
              <h1 className="mt-3 text-2xl font-semibold text-slate-900">互动与访问统计</h1>
              <p className="mt-2 text-sm text-slate-500">把访问趋势、访客画像、文章转化和异常排查拆开看，会更清楚。</p>
            </div>

            <div className="flex flex-col gap-3 xl:items-end">
              <div className="flex flex-wrap gap-2">
                {RANGE_OPTIONS.map(option => {
                  const active = option.key === rangeState.key
                  const href = buildAnalyticsHref(option.key, deviceState, selectedIp, selfState)
                  return (
                    <Link
                      key={option.key}
                      href={href}
                      className={`rounded-full px-4 py-2 text-sm transition ${
                        active
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800'
                      }`}
                    >
                      {option.label}
                    </Link>
                  )
                })}
              </div>
              <div className="flex flex-wrap gap-2 xl:justify-end">
                {DEVICE_OPTIONS.map(option => {
                  const active = option.key === deviceState
                  const href = buildAnalyticsHref(rangeState.key, option.key, selectedIp, selfState)
                  return (
                    <Link
                      key={option.key}
                      href={href}
                      className={`rounded-full px-4 py-2 text-sm transition ${
                        active
                          ? 'bg-slate-100 text-slate-900 shadow-inner'
                          : 'border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800'
                      }`}
                    >
                      {option.label}
                    </Link>
                  )
                })}
              </div>
              <p className="text-xs text-slate-400">统计区间：{rangeText}</p>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 px-5 py-4 sm:px-6">
          <div className="flex flex-wrap gap-2">
            <FilterChip label="范围" value={selectedRangeLabel} />
            <FilterChip label="设备" value={selectedDeviceLabel} />
            <FilterChip label="IP" value={selectedIp ?? '全部访客'} />
            <FilterChip label="自己访问" value={selfState === 'hide' ? '已隐藏' : '已显示'} />
            <FilterChip label="白名单" value={ownerTrafficRules.ips.length || ownerTrafficRules.devices.length ? '已生效' : '未设置'} />
            <FilterChip label="截止" value={formatDateTime(now)} />
          </div>
        </div>
      </SectionCard>

      {currentVisitorIp ? (
        <SectionCard className="px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Self Traffic</p>
              <h2 className="mt-2 text-base font-semibold text-slate-900">
                {selfState === 'hide' ? '已自动隐藏你当前的访问' : '正在显示你当前的访问'}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                当前登录 IP：{currentVisitorIp}。这样能把你调试网站、反复刷新产生的噪音先筛掉。
              </p>
              <p className="mt-1 text-sm text-slate-500">
                设备白名单现在改成了精确签名匹配，不再按「iPhone / Chrome / macOS」这种宽泛关键词误伤真实访客。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={buildAnalyticsHref(
                  rangeState.key,
                  deviceState,
                  selectedIp,
                  selfState === 'hide' ? 'show' : 'hide',
                )}
                className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              >
                {selfState === 'hide' ? '查看我的访问' : '隐藏我的访问'}
              </Link>
              <OwnerDeviceAllowlistButton />
              <Link
                href="/houtai/settings?section=analytics"
                className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              >
                去设置白名单
              </Link>
            </div>
          </div>
        </SectionCard>
      ) : null}

      {selectedIp ? (
        <SectionCard className="px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Trace</p>
              <h2 className="mt-2 text-base font-semibold text-slate-900">正在查看 IP 轨迹：{selectedIp}</h2>
              <p className="mt-1 text-sm text-slate-500">
                当前页面的统计、排行和最近记录都已切换到这个 IP
                {deviceState !== 'all' ? `，并限定为「${DEVICE_OPTIONS.find(option => option.key === deviceState)?.label}」设备` : ''}
                。
              </p>
            </div>
            <Link
              href={buildAnalyticsHref(rangeState.key, deviceState, null, selfState)}
              className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            >
              清除 IP 轨迹
            </Link>
          </div>
        </SectionCard>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="总访问" value={formatNumber(siteMetrics.pv)} note={`文章页占比 ${formatPercent(siteMetrics.articlePv, siteMetrics.pv)}`} />
        <MetricCard label="独立访客" value={formatNumber(siteMetrics.uv)} note={`识别到 ${formatNumber(siteMetrics.uniqueIp)} 个访问 IP`} />
        <MetricCard label="有效阅读" value={formatNumber(interactionTotals.qualifiedRead)} note={`完成率 ${formatPercent(interactionTotals.qualifiedRead, interactionTotals.articleEnter)}`} />
        <MetricCard label="新增互动" value={formatNumber(interactionTotals.interactions)} note={`赞 ${formatNumber(interactionTotals.likes)} · 转 ${formatNumber(interactionTotals.shares)} · 评 ${formatNumber(interactionTotals.comments)}`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard className="px-5 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">流量结构</h2>
              <p className="mt-1 text-xs text-slate-400">先看访问质量，再判断内容是否真的被读进去。</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <CompactStat label="直接访问占比" value={directRate} note={`${formatNumber(siteMetrics.directPv)} 次访问`} />
            <CompactStat label="站外来源占比" value={externalRate} note={`${formatNumber(siteMetrics.externalPv)} 次访问`} />
            <CompactStat label="平均停留" value={formatDuration(siteMetrics.avgDuration)} note="全站范围" />
            <CompactStat label="文章页平均停留" value={formatDuration(siteMetrics.articleAvgDuration)} note="只看文章页" />
          </div>
        </SectionCard>

        <SectionCard className="px-5 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">访客画像</h2>
              <p className="mt-1 text-xs text-slate-400">把主力设备、系统和互动倾向单独拎出来看。</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <CompactStat
              label="主力设备"
              value={topDeviceEntry ? `${topDeviceEntry[0]} ${formatPercent(topDeviceEntry[1], siteMetrics.pv)}` : '设备待识别'}
              note={`${topOsEntry?.[0] || '系统待识别'} · ${topBrowserEntry?.[0] || '浏览器待识别'}`}
            />
            <CompactStat label="互动率" value={interactionRate} note={`${formatNumber(interactionTotals.interactions)} 次互动 / ${formatNumber(interactionTotals.articleEnter)} 次进入`} />
            <CompactStat label="转发占比" value={shareRate} note={`链接 + 海报共 ${formatNumber(interactionTotals.shares)} 次`} />
            <CompactStat label="当前设备筛选" value={selectedDeviceLabel} note={selectedIp ? `仅看 ${selectedIp}` : '未限定单个 IP'} />
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard>
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">文章表现</h2>
              <p className="mt-1 text-xs text-slate-400">先看哪些内容真正被读完、被互动。</p>
            </div>
            <Link href="/houtai/articles" className="text-xs text-slate-400 transition hover:text-slate-600">
              去文章管理 →
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {articleRows.length === 0 ? (
              <p className="px-5 py-12 text-sm text-slate-400">当前范围没有文章互动数据。</p>
            ) : (
              articleRows.map(row => (
                <div key={row.articleId} className="flex items-start justify-between gap-4 px-5 py-4 transition hover:bg-slate-50/80">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/houtai/articles/${row.articleId}/edit`} className="truncate text-sm font-medium text-slate-800 transition hover:text-slate-950">
                        {row.title}
                      </Link>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${ACCESS_STYLES[row.accessType] ?? 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                        {ACCESS_LABELS[row.accessType] ?? row.accessType}
                      </span>
                      {!row.published ? (
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                          草稿
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      有效阅读 {formatNumber(row.qualified)} · 进入 {formatNumber(row.enters)} · 完成率 {formatPercent(row.qualified, row.enters)}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      互动 {formatNumber(row.interactionCount)}（赞 {formatNumber(row.likes)} / 转 {formatNumber(row.shareCount)} / 评 {formatNumber(row.comments)}）
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-semibold text-slate-900">{formatNumber(row.interactionCount)}</p>
                    <p className="mt-1 text-xs text-slate-400">总互动</p>
                    <p className="mt-3 text-[11px] text-slate-400">{row.updatedAt ? `更新于 ${formatDateTime(row.updatedAt)}` : '暂无更新时间'}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <div className="grid gap-6">
          <RankListCard title="高频 IP" items={topIps} />
          <RankListCard title="高频页面" items={topPages} />
          <RankListCard title="来源 Top" items={topReferrers} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <RankListCard title="设备分布" items={deviceBreakdown} />
        <RankListCard title="浏览器排行" items={topBrowsers} />
        <RankListCard title="系统排行" items={topOperatingSystems} />
      </div>

      {selectedIp ? (
        <SectionCard>
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-800">单个 IP 访问轨迹</h2>
            <p className="mt-1 text-xs text-slate-400">按时间倒序展示这个 IP 在当前筛选条件下的访问路径。</p>
          </div>
          <div className="divide-y divide-slate-100">
            {ipTraceRows.length === 0 ? (
              <p className="px-5 py-12 text-sm text-slate-400">当前筛选条件下还没有这条 IP 的访问轨迹。</p>
            ) : (
              ipTraceRows.map(item => (
                <div key={item.id} className="flex items-start justify-between gap-4 px-5 py-4 transition hover:bg-slate-50/80">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-500">
                        会话 {item.sessionId.slice(-8)}
                      </span>
                      <Link href={item.path} target="_blank" className="truncate text-sm font-medium text-slate-800 transition hover:text-slate-950">
                        {item.displayPath}
                      </Link>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">{item.deviceProfile.summary}</p>
                    {item.deviceProfile.detail ? <p className="mt-1 text-xs text-slate-400">{item.deviceProfile.detail}</p> : null}
                    <p className="mt-1 text-xs text-slate-400">来源 {item.displayReferrer}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-700">{formatDuration(item.duration)}</p>
                    <p className="mt-1 text-xs text-slate-400">{formatDateTime(item.enteredAt)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard>
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-800">最近访问</h2>
            <p className="mt-1 text-xs text-slate-400">自动合并同会话、同页面、短时间内的重复访问记录。</p>
          </div>
          <div className="divide-y divide-slate-100">
            {recentVisits.length === 0 ? (
              <p className="px-5 py-12 text-sm text-slate-400">当前范围还没有访问记录。</p>
            ) : (
              recentVisits.map(item => (
                <div key={item.id} className="flex items-start justify-between gap-4 px-5 py-4 transition hover:bg-slate-50/80">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={item.path} target="_blank" className="text-sm font-medium text-slate-800 transition hover:text-slate-950">
                        {item.displayPath}
                      </Link>
                      {item.mergedCount > 1 ? (
                        <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                          合并 {formatNumber(item.mergedCount)} 条
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-xs font-mono text-slate-500">{item.displayIp}</p>
                    <p className="mt-1 text-xs text-slate-400">{item.displayLocation} · {item.displayReferrer}</p>
                    <p className="mt-1 text-xs text-slate-400">{item.deviceProfile.summary}</p>
                    {item.deviceProfile.detail ? <p className="mt-1 text-xs text-slate-400">{item.deviceProfile.detail}</p> : null}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-700">{formatDuration(item.mergedDuration)}</p>
                    <p className="mt-1 text-xs text-slate-400">{formatDateTime(item.enteredAt)}</p>
                    <Link
                      href={item.traceHref}
                      className="mt-2 inline-flex rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                    >
                      查看轨迹
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard>
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-800">最近互动</h2>
            <p className="mt-1 text-xs text-slate-400">自动合并同文章、同类型、短时间内的重复互动。</p>
          </div>
          <div className="divide-y divide-slate-100">
            {recentInteractionRows.length === 0 ? (
              <p className="px-5 py-12 text-sm text-slate-400">当前范围还没有互动记录。</p>
            ) : (
              recentInteractionRows.map(item => (
                <div key={item.id} className="flex items-start justify-between gap-4 px-5 py-4 transition hover:bg-slate-50/80">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${getInteractionTone(item.type)}`}>
                        {getInteractionLabel(item.type)}
                      </span>
                      <Link href={`/houtai/articles/${item.articleId}/edit`} className="truncate text-sm font-medium text-slate-800 transition hover:text-slate-950">
                        {item.article.title}
                      </Link>
                      {item.mergedCount > 1 ? (
                        <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                          合并 {formatNumber(item.mergedCount)} 条
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      {item.channel ? `${item.channel} · ` : ''}
                      {formatIpAddress(item.ipAddress)} · {formatLocation(item.ipRegion, item.ipCity)}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">{item.deviceProfile.summary}</p>
                    {item.deviceProfile.detail ? <p className="mt-1 text-xs text-slate-400">{item.deviceProfile.detail}</p> : null}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">{formatDateTime(item.createdAt)}</p>
                    <Link
                      href={`/houtai/articles/${item.articleId}/edit`}
                      className="mt-2 inline-flex rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                    >
                      去编辑
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
