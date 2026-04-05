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
import {
  AnalyticsTabCard,
  BarListChartCard,
  CompactStat,
  FilterChip,
  InsightCard,
  MetricCard,
  RankListCard,
  SectionCard,
  SegmentBarCard,
  TimelineChartCard,
  type RankItem,
  type SegmentItem,
} from '@/components/houtai/admin-analytics-ui'
import {
  ACCESS_LABELS,
  ACCESS_STYLES,
  ANALYTICS_TABS,
  DEVICE_OPTIONS,
  RANGE_OPTIONS,
  buildAnalyticsHref,
  buildDeviceFilterSql,
  buildIpFilterSql,
  buildTimeBucketSql,
  buildTimelinePoints,
  extractMetadataDeviceInfo,
  extractMetadataDevicePayload,
  formatDuration,
  formatIpAddress,
  formatLatency,
  formatLocation,
  formatNumber,
  formatPercent,
  getInteractionLabel,
  getInteractionTone,
  getMascotErrorLabel,
  groupRecentInteractions,
  groupRecentVisits,
  matchesDeviceFilter,
  matchesIpFilter,
  normalizeReferrer,
  prettifyPath,
  resolveDeviceFilter,
  resolveIpFilter,
  resolveRange,
  resolveSelfFilter,
  resolveTab,
  safeDecode,
  truncateText,
  type AnalyticsTabKey,
  type DeviceFilterKey,
  type RangeKey,
  type SelfFilterKey,
} from '@/components/houtai/admin-analytics-helpers'


type PageProps = {
  searchParams: Promise<{ range?: string | string[]; device?: string | string[]; ip?: string | string[]; self?: string | string[]; tab?: string | string[] }>
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

type TrafficTrendRow = {
  bucket: Date | string
  views: number
  visitors: number
  articleViews: number
}

type EngagementTrendRow = {
  bucket: Date | string
  qualifiedReads: number
  interactions: number
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

type RegionRow = {
  regionLabel: string
  views: number
  visitors: number
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

type MascotMetricsRow = {
  totalChats: number
  uniqueVisitors: number
  successCount: number
  fallbackCount: number
  avgLatencyMs: number | null
  avgMessageChars: number | null
  avgReplyChars: number | null
}

type MascotQuestionRow = {
  message: string
  count: number
  successCount: number
}

type MascotErrorRow = {
  errorType: string
  count: number
}

type MascotModelRow = {
  model: string | null
  count: number
}

type MascotHealthRow = {
  lastSuccessAt: Date | string | null
  lastFailureAt: Date | string | null
  authErrors: number
  rateLimitErrors: number
  balanceErrors: number
  networkErrors: number
  emptyReplyErrors: number
  providerErrors: number
}

type MascotRecentRow = {
  id: string
  sessionId: string | null
  visitorId: string | null
  path: string | null
  message: string
  reply: string
  mode: string
  model: string | null
  success: boolean
  fallbackUsed: boolean
  providerStatus: number | null
  errorType: string | null
  latencyMs: number | null
  ipAddress: string | null
  ipRegion: string | null
  ipCity: string | null
  userAgent: string | null
  deviceInfo: Prisma.JsonValue | null
  createdAt: Date | string
}

type VisitorQualityRow = {
  knownIpCount: number
  unknownIpCount: number
  returningIpCount: number
  singleVisitIpCount: number
  avgSessionsPerIp: number | null
  avgViewsPerIp: number | null
}

type DetailedVisitorRow = {
  ipAddress: string | null
  ipRegion: string | null
  ipCity: string | null
  views: number
  sessions: number
  uniquePaths: number
  avgDuration: number | null
  firstSeen: Date | string
  lastSeen: Date | string
  userAgent: string | null
  deviceCount: number
}

type SelectedIpSummaryRow = {
  views: number
  sessions: number
  uniquePaths: number
  avgDuration: number | null
  firstSeen: Date | string | null
  lastSeen: Date | string | null
  ipRegion: string | null
  ipCity: string | null
}


export default async function AdminAnalyticsPage({ searchParams }: PageProps) {
  const { range, device, ip, self, tab } = await searchParams
  const now = new Date()
  const requestHeaders = await headers()
  const rangeState = resolveRange(range)
  const deviceState = resolveDeviceFilter(device)
  const selectedIp = resolveIpFilter(ip)
  const selfState = resolveSelfFilter(self)
  const selectedTab = resolveTab(tab)
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
  const ownerMascotSql = buildOwnerTrafficExcludeSql({
    ipColumn: '"ipAddress"',
    deviceSignatureSql: `"deviceInfo"->>'signature'`,
    rules: ownerTrafficRules,
  })
  const pageViewSelfSql = shouldHideCurrentVisitor && currentVisitorIp
    ? Prisma.sql`AND COALESCE(NULLIF("ipAddress", ''), '') <> ${currentVisitorIp}`
    : Prisma.empty
  const interactionSelfSql = shouldHideCurrentVisitor && currentVisitorIp
    ? Prisma.sql`AND COALESCE(NULLIF("ipAddress", ''), '') <> ${currentVisitorIp}`
    : Prisma.empty
  const mascotSelfSql = shouldHideCurrentVisitor && currentVisitorIp
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

  const mascotBaseSql = Prisma.sql`
    FROM "MascotChatLog"
    WHERE 1 = 1
    ${rangeState.from ? Prisma.sql`AND "createdAt" >= ${rangeState.from}` : Prisma.empty}
    ${buildDeviceFilterSql('"userAgent"', deviceState)}
    ${buildIpFilterSql('"ipAddress"', selectedIp)}
    ${ownerMascotSql}
    ${mascotSelfSql}
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

  const [
    siteMetricsResult,
    trafficTrendRaw,
    engagementTrendRaw,
    regionRowsRaw,
    visitorQualityResult,
    detailedVisitorsRaw,
    selectedIpSummaryResult,
    topPagesRaw,
    rawReferrers,
    interactionTotalsResult,
    articlePerformanceRaw,
    topIpsRaw,
    recentVisitsRaw,
    userAgentGroupsRaw,
    ipTraceRaw,
    recentInteractionsRaw,
  ] =
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
      prisma.$queryRaw<TrafficTrendRow[]>(Prisma.sql`
        SELECT
          ${buildTimeBucketSql('"enteredAt"', rangeState.key)} AS "bucket",
          COUNT(*)::int AS "views",
          COUNT(DISTINCT COALESCE(NULLIF("visitorId", ''), "sessionId"))::int AS "visitors",
          COUNT(*) FILTER (WHERE "articleId" IS NOT NULL)::int AS "articleViews"
        ${pageViewBaseSql}
        GROUP BY 1
        ORDER BY 1 ASC
      `),
      prisma.$queryRaw<EngagementTrendRow[]>(Prisma.sql`
        SELECT
          ${buildTimeBucketSql('"createdAt"', rangeState.key)} AS "bucket",
          COUNT(*) FILTER (WHERE "type" = 'VIEW_QUALIFIED')::int AS "qualifiedReads",
          COUNT(*) FILTER (WHERE "type" IN ('LIKE', 'SHARE_LINK', 'SHARE_IMAGE', 'COMMENT_SUBMIT'))::int AS "interactions"
        ${interactionBaseSql}
        GROUP BY 1
        ORDER BY 1 ASC
      `),
      prisma.$queryRaw<RegionRow[]>(Prisma.sql`
        SELECT
          COALESCE(
            NULLIF(
              TRIM(CONCAT_WS(' · ', NULLIF("ipRegion", ''), NULLIF("ipCity", ''))),
              ''
            ),
            '地区待识别'
          ) AS "regionLabel",
          COUNT(*)::int AS "views",
          COUNT(DISTINCT COALESCE(NULLIF("ipAddress", ''), "sessionId"))::int AS "visitors"
        ${pageViewBaseSql}
        GROUP BY 1
        ORDER BY 2 DESC
        LIMIT 8
      `),
      prisma.$queryRaw<VisitorQualityRow[]>(Prisma.sql`
        SELECT
          COUNT(*) FILTER (WHERE "isKnownIp" = true)::int AS "knownIpCount",
          COUNT(*) FILTER (WHERE "isKnownIp" = false)::int AS "unknownIpCount",
          COUNT(*) FILTER (WHERE "views" = 1)::int AS "singleVisitIpCount",
          COUNT(*) FILTER (WHERE "sessions" >= 2 OR "views" >= 3)::int AS "returningIpCount",
          COALESCE(AVG("sessions"), 0)::float AS "avgSessionsPerIp",
          COALESCE(AVG("views"), 0)::float AS "avgViewsPerIp"
        FROM (
          SELECT
            CASE
              WHEN COALESCE(NULLIF("ipAddress", ''), '') <> '' THEN NULLIF("ipAddress", '')
              ELSE CONCAT(
                'unknown:',
                COALESCE(NULLIF("visitorId", ''), NULLIF("sessionId", ''), CAST("id" AS TEXT))
              )
            END AS "visitorKey",
            COALESCE(NULLIF("ipAddress", ''), '') <> '' AS "isKnownIp",
            COUNT(*)::int AS "views",
            COUNT(DISTINCT COALESCE(NULLIF("sessionId", ''), CAST("id" AS TEXT)))::int AS "sessions"
          ${pageViewBaseSql}
          GROUP BY 1, 2
        ) AS "visitorStats"
      `),
      prisma.$queryRaw<DetailedVisitorRow[]>(Prisma.sql`
        SELECT
          COALESCE(NULLIF("ipAddress", ''), '未知 IP') AS "ipAddress",
          MAX(NULLIF("ipRegion", '')) AS "ipRegion",
          MAX(NULLIF("ipCity", '')) AS "ipCity",
          COUNT(*)::int AS "views",
          COUNT(DISTINCT "sessionId")::int AS "sessions",
          COUNT(DISTINCT "path")::int AS "uniquePaths",
          COALESCE(AVG("duration") FILTER (WHERE "duration" IS NOT NULL), 0)::float AS "avgDuration",
          MIN("enteredAt") AS "firstSeen",
          MAX("enteredAt") AS "lastSeen",
          MAX(NULLIF("userAgent", '')) AS "userAgent",
          COUNT(
            DISTINCT COALESCE(
              NULLIF("deviceInfo"->>'signature', ''),
              NULLIF("userAgent", ''),
              "sessionId"
            )
          )::int AS "deviceCount"
        ${pageViewBaseSql}
        GROUP BY 1
        ORDER BY COUNT(*) DESC, MAX("enteredAt") DESC
        LIMIT 12
      `),
      selectedIp
        ? prisma.$queryRaw<SelectedIpSummaryRow[]>(Prisma.sql`
            SELECT
              COUNT(*)::int AS "views",
              COUNT(DISTINCT "sessionId")::int AS "sessions",
              COUNT(DISTINCT "path")::int AS "uniquePaths",
              COALESCE(AVG("duration") FILTER (WHERE "duration" IS NOT NULL), 0)::float AS "avgDuration",
              MIN("enteredAt") AS "firstSeen",
              MAX("enteredAt") AS "lastSeen",
              MAX(NULLIF("ipRegion", '')) AS "ipRegion",
              MAX(NULLIF("ipCity", '')) AS "ipCity"
            ${pageViewBaseSql}
          `)
        : Promise.resolve([]),
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
            ${buildOwnerTrafficExcludeSql({
              ipColumn: 'ai."ipAddress"',
              deviceSignatureSql: `ai."metadata"->'deviceInfo'->>'signature'`,
              rules: ownerTrafficRules,
            })}
            ${shouldHideCurrentVisitor && currentVisitorIp
              ? Prisma.sql`AND COALESCE(NULLIF(ai."ipAddress", ''), '') <> ${currentVisitorIp}`
              : Prisma.empty}
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

  let mascotMetricsResult: MascotMetricsRow[] = []
  let mascotQuestionRowsRaw: MascotQuestionRow[] = []
  let mascotErrorRowsRaw: MascotErrorRow[] = []
  let mascotModelRowsRaw: MascotModelRow[] = []
  let mascotHealthRowsRaw: MascotHealthRow[] = []
  let mascotRecentRowsRaw: MascotRecentRow[] = []

  try {
    ;[
      mascotMetricsResult,
      mascotQuestionRowsRaw,
      mascotErrorRowsRaw,
      mascotModelRowsRaw,
      mascotHealthRowsRaw,
      mascotRecentRowsRaw,
    ] = await Promise.all([
      prisma.$queryRaw<MascotMetricsRow[]>(Prisma.sql`
        SELECT
          COUNT(*)::int AS "totalChats",
          COUNT(
            DISTINCT COALESCE(
              NULLIF("visitorId", ''),
              NULLIF("sessionId", ''),
              NULLIF("ipAddress", ''),
              'unknown'
            )
          )::int AS "uniqueVisitors",
          COUNT(*) FILTER (WHERE "success" = true)::int AS "successCount",
          COUNT(*) FILTER (WHERE "fallbackUsed" = true)::int AS "fallbackCount",
          COALESCE(AVG("latencyMs") FILTER (WHERE "latencyMs" IS NOT NULL), 0)::float AS "avgLatencyMs",
          COALESCE(AVG("messageChars"), 0)::float AS "avgMessageChars",
          COALESCE(AVG("replyChars"), 0)::float AS "avgReplyChars"
        ${mascotBaseSql}
      `),
      prisma.$queryRaw<MascotQuestionRow[]>(Prisma.sql`
        SELECT
          LEFT(TRIM("message"), 80) AS "message",
          COUNT(*)::int AS "count",
          COUNT(*) FILTER (WHERE "success" = true)::int AS "successCount"
        ${mascotBaseSql}
        GROUP BY 1
        ORDER BY 2 DESC, MAX("createdAt") DESC
        LIMIT 6
      `),
      prisma.$queryRaw<MascotErrorRow[]>(Prisma.sql`
        SELECT
          COALESCE(NULLIF("errorType", ''), 'other') AS "errorType",
          COUNT(*)::int AS "count"
        ${mascotBaseSql}
        AND "success" = false
        GROUP BY 1
        ORDER BY 2 DESC
        LIMIT 6
      `),
      prisma.$queryRaw<MascotModelRow[]>(Prisma.sql`
        SELECT
          NULLIF("model", '') AS "model",
          COUNT(*)::int AS "count"
        ${mascotBaseSql}
        GROUP BY 1
        ORDER BY 2 DESC
        LIMIT 4
      `),
      prisma.$queryRaw<MascotHealthRow[]>(Prisma.sql`
        SELECT
          MAX("createdAt") FILTER (WHERE "success" = true) AS "lastSuccessAt",
          MAX("createdAt") FILTER (WHERE "success" = false) AS "lastFailureAt",
          COUNT(*) FILTER (WHERE "errorType" = 'auth')::int AS "authErrors",
          COUNT(*) FILTER (WHERE "errorType" = 'rate_limit')::int AS "rateLimitErrors",
          COUNT(*) FILTER (WHERE "errorType" = 'insufficient_balance')::int AS "balanceErrors",
          COUNT(*) FILTER (WHERE "errorType" = 'network')::int AS "networkErrors",
          COUNT(*) FILTER (WHERE "errorType" = 'empty_reply')::int AS "emptyReplyErrors",
          COUNT(*) FILTER (WHERE "errorType" IN ('provider_server', 'provider_error'))::int AS "providerErrors"
        ${mascotBaseSql}
      `),
      prisma.$queryRaw<MascotRecentRow[]>(Prisma.sql`
        SELECT
          "id",
          "sessionId",
          "visitorId",
          "path",
          "message",
          "reply",
          "mode",
          "model",
          "success",
          "fallbackUsed",
          "providerStatus",
          "errorType",
          "latencyMs",
          "ipAddress",
          "ipRegion",
          "ipCity",
          "userAgent",
          "deviceInfo",
          "createdAt"
        ${mascotBaseSql}
        ORDER BY "createdAt" DESC
        LIMIT 10
      `),
    ])
  } catch (error) {
    console.error('[analytics] mascot chat stats unavailable:', error)
  }

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

  const mascotMetrics = mascotMetricsResult[0] ?? {
    totalChats: 0,
    uniqueVisitors: 0,
    successCount: 0,
    fallbackCount: 0,
    avgLatencyMs: 0,
    avgMessageChars: 0,
    avgReplyChars: 0,
  }

  const mascotHealth = mascotHealthRowsRaw[0] ?? {
    lastSuccessAt: null,
    lastFailureAt: null,
    authErrors: 0,
    rateLimitErrors: 0,
    balanceErrors: 0,
    networkErrors: 0,
    emptyReplyErrors: 0,
    providerErrors: 0,
  }

  const visitorQuality = visitorQualityResult[0] ?? {
    knownIpCount: 0,
    unknownIpCount: 0,
    returningIpCount: 0,
    singleVisitIpCount: 0,
    avgSessionsPerIp: 0,
    avgViewsPerIp: 0,
  }

  const selectedIpSummary = selectedIpSummaryResult[0] ?? null

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

  const mascotSuccessRate = formatPercent(mascotMetrics.successCount, mascotMetrics.totalChats)
  const mascotFallbackRate = formatPercent(mascotMetrics.fallbackCount, mascotMetrics.totalChats)
  const mascotTopModel = mascotModelRowsRaw[0]?.model || '未记录'
  const mascotHealthStatus =
    mascotMetrics.totalChats === 0
      ? '暂无会话'
      : mascotMetrics.successCount === 0
        ? '需要检查'
        : mascotMetrics.fallbackCount === 0
          ? '稳定'
          : mascotMetrics.successCount / Math.max(1, mascotMetrics.totalChats) >= 0.8
            ? '可用'
            : '有波动'
  const mascotQuestions: RankItem[] = mascotQuestionRowsRaw.map(item => ({
    label: truncateText(item.message, 44) || '空问题',
    value: Number(item.count ?? 0),
    meta: `成功 ${formatPercent(Number(item.successCount ?? 0), Number(item.count ?? 0))}`,
  }))
  const mascotErrors: RankItem[] = mascotErrorRowsRaw.map(item => ({
    label: getMascotErrorLabel(item.errorType),
    value: Number(item.count ?? 0),
    meta: item.errorType,
  }))
  const mascotRecentRows = mascotRecentRowsRaw.map(item => ({
    ...item,
    displayIp: formatIpAddress(item.ipAddress),
    displayLocation: formatLocation(item.ipRegion, item.ipCity),
    displayPath: item.path ? prettifyPath(item.path, titleBySlug) : '未记录页面',
    deviceProfile: describeDevice(item.userAgent, sanitizeDeviceInfo(item.deviceInfo)),
  }))

  const trafficTrendPoints = buildTimelinePoints(
    trafficTrendRaw.map(item => ({ bucket: item.bucket, value: Number(item.views ?? 0) })),
    rangeState.key,
    now,
    rangeState.from,
  )
  const engagementTrendPoints = buildTimelinePoints(
    engagementTrendRaw.map(item => ({ bucket: item.bucket, value: Number(item.interactions ?? 0) })),
    rangeState.key,
    now,
    rangeState.from,
  )
  const trafficVisitorsTotal = trafficTrendRaw.reduce((sum, item) => sum + Number(item.visitors ?? 0), 0)
  const trafficArticleViewsTotal = trafficTrendRaw.reduce((sum, item) => sum + Number(item.articleViews ?? 0), 0)
  const engagementQualifiedTotal = engagementTrendRaw.reduce((sum, item) => sum + Number(item.qualifiedReads ?? 0), 0)
  const internalPv = Math.max(
    Number(siteMetrics.pv ?? 0) - Number(siteMetrics.directPv ?? 0) - Number(siteMetrics.externalPv ?? 0),
    0,
  )
  const knownVisitorCount = Number(visitorQuality.knownIpCount ?? 0)
  const unknownVisitorCount = Number(visitorQuality.unknownIpCount ?? 0)
  const totalVisitorBuckets = knownVisitorCount + unknownVisitorCount

  const trafficSourceSegments: SegmentItem[] = [
    { label: '直接访问', value: Number(siteMetrics.directPv ?? 0), tone: 'bg-slate-500' },
    { label: '站外来源', value: Number(siteMetrics.externalPv ?? 0), tone: 'bg-sky-500' },
    { label: '站内流转', value: internalPv, tone: 'bg-emerald-500' },
  ]

  const realIpSegments: SegmentItem[] = [
    { label: '真实 IP', value: knownVisitorCount, tone: 'bg-emerald-500' },
    { label: '未知访客', value: unknownVisitorCount, tone: 'bg-amber-400' },
  ]

  const topRegions: RankItem[] = regionRowsRaw.map(item => ({
    label: item.regionLabel,
    value: Number(item.views ?? 0),
    meta: `${formatNumber(Number(item.visitors ?? 0))} 位访客`,
  }))

  const topIps: RankItem[] = topIpsRaw.map(item => ({
    label: formatIpAddress(item.ipAddress),
    value: Number(item.views ?? 0),
    meta: `${formatLocation(item.ipRegion, item.ipCity)} · ${describeDevice(item.userAgent).summary} · ${formatNumber(Number(item.sessions ?? 0))} 次会话`,
    href: buildAnalyticsHref(rangeState.key, deviceState, formatIpAddress(item.ipAddress), selfState, 'visitors'),
    highlighted: Boolean(selectedIp && selectedIp === formatIpAddress(item.ipAddress)),
  }))
  const realTopIps = topIps.filter(item => item.label !== '未知 IP')
  const visitorIpLeaderboard = realTopIps.length > 0 ? realTopIps : topIps

  const detailedVisitors = detailedVisitorsRaw.map(item => ({
    ...item,
    displayIp: formatIpAddress(item.ipAddress),
    displayLocation: formatLocation(item.ipRegion, item.ipCity),
    deviceProfile: describeDevice(item.userAgent),
    traceHref: buildAnalyticsHref(rangeState.key, deviceState, formatIpAddress(item.ipAddress), selfState, 'visitors'),
  }))
  const realDetailedVisitors = detailedVisitors.filter(item => item.displayIp !== '未知 IP')
  const visitorLeaderboard = realDetailedVisitors.length > 0 ? realDetailedVisitors : detailedVisitors

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
      traceHref: buildAnalyticsHref(rangeState.key, deviceState, formatIpAddress(item.ipAddress), selfState, 'visitors'),
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
  const topArticle = articleRows[0]
  const activeTabMeta = ANALYTICS_TABS.find(option => option.key === selectedTab) ?? ANALYTICS_TABS[0]
  const analyticsTabCards = [
    {
      key: 'overview' as const,
      label: '总览',
      description: '把流量质量、阅读完成和当前筛选范围先看明白。',
      value: `${formatNumber(siteMetrics.pv)} 访问 / ${formatNumber(siteMetrics.uv)} 人`,
    },
    {
      key: 'mascot' as const,
      label: '数字分身',
      description: '看真实聊天量、成功率和最近异常。',
      value: mascotMetrics.totalChats > 0 ? `${formatNumber(mascotMetrics.totalChats)} 次会话` : '暂无真实会话',
    },
    {
      key: 'content' as const,
      label: '内容转化',
      description: '看哪些文章真的被读完、被互动。',
      value: `${formatNumber(interactionTotals.interactions)} 次互动`,
    },
    {
      key: 'visitors' as const,
      label: '访客明细',
      description: selectedIp ? `当前已锁定 ${selectedIp}` : '看 IP、设备来源和访问轨迹。',
      value: selectedIp ? '单 IP 轨迹' : `${formatNumber(siteMetrics.uniqueIp)} 个访问 IP`,
    },
  ]
  const overviewInsights = [
    {
      eyebrow: '流量',
      title: siteMetrics.pv === 0 ? '当前范围还没有访问数据' : siteMetrics.directPv >= siteMetrics.externalPv ? '当前还是直接访问为主' : '站外引流正在抬头',
      description: siteMetrics.pv === 0
        ? '先放宽时间范围，或者切到其他模块看看有没有互动和分身对话。'
        : `直接访问 ${directRate}，站外来源 ${externalRate}，平均停留 ${formatDuration(siteMetrics.avgDuration)}。`,
    },
    {
      eyebrow: '内容',
      title: topArticle ? `《${truncateText(topArticle.title, 22)}》目前最能带动互动` : '当前还没有可比较的文章转化',
      description: topArticle
        ? `总互动 ${formatNumber(topArticle.interactionCount)}，有效阅读 ${formatNumber(topArticle.qualified)}，完成率 ${formatPercent(topArticle.qualified, topArticle.enters)}。`
        : '你可以先看“内容转化”模块，等真实访客再多一点，结论会更稳。',
    },
    {
      eyebrow: '访客',
      title: topDeviceEntry ? `${topDeviceEntry[0]} 仍是主力设备` : '访客设备还在逐步识别',
      description: topDeviceEntry
        ? `${topBrowserEntry?.[0] || '浏览器待识别'} / ${topOsEntry?.[0] || '系统待识别'} 最常见，当前互动率 ${interactionRate}。`
        : `当前设备筛选是「${selectedDeviceLabel}」，后面有更多访问后这里会更清楚。`,
    },
    {
      eyebrow: '分身',
      title: mascotMetrics.totalChats === 0 ? '数字分身暂时还没有真实对话' : `数字分身当前状态：${mascotHealthStatus}`,
      description: mascotMetrics.totalChats === 0
        ? '一旦有访客开始聊天，这里会直接告诉你成功率、模型状态和常见问题。'
        : `成功率 ${mascotSuccessRate}，降级率 ${mascotFallbackRate}，当前主模型 ${mascotTopModel}。`,
    },
  ]

  return (
    <div className="space-y-6">
      <SectionCard className="overflow-hidden">
        <div className="px-5 py-6 sm:px-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Analytics</p>
              <h1 className="mt-3 text-2xl font-semibold text-slate-900">互动与访问统计</h1>
              <p className="mt-2 text-sm text-slate-500">现在改成按模块切换查看，先总览，再深入到内容、访客或数字分身，会更清楚。</p>
            </div>

            <div className="flex flex-col gap-3 xl:items-end">
              <div className="flex flex-wrap gap-2">
                {RANGE_OPTIONS.map(option => {
                  const active = option.key === rangeState.key
                  const href = buildAnalyticsHref(option.key, deviceState, selectedIp, selfState, selectedTab)
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
                  const href = buildAnalyticsHref(rangeState.key, option.key, selectedIp, selfState, selectedTab)
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
              <p className="text-xs text-slate-500">当前模块：{activeTabMeta.label} · {activeTabMeta.description}</p>
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

        <div className="border-t border-slate-100 px-5 py-5 sm:px-6">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {analyticsTabCards.map(item => (
              <AnalyticsTabCard
                key={item.key}
                label={item.label}
                description={item.description}
                value={item.value}
                href={buildAnalyticsHref(rangeState.key, deviceState, selectedIp, selfState, item.key)}
                active={selectedTab === item.key}
              />
            ))}
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
                  selectedTab,
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
              href={buildAnalyticsHref(rangeState.key, deviceState, null, selfState, selectedTab)}
              className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            >
              清除 IP 轨迹
            </Link>
          </div>
        </SectionCard>
      ) : null}

      {selectedTab === 'overview' ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="总访问" value={formatNumber(siteMetrics.pv)} note={`文章页占比 ${formatPercent(siteMetrics.articlePv, siteMetrics.pv)}`} toneClass="from-sky-700 via-sky-600 to-cyan-500" />
            <MetricCard label="独立访客" value={formatNumber(siteMetrics.uv)} note={`识别到 ${formatNumber(siteMetrics.uniqueIp)} 个访问 IP`} toneClass="from-emerald-700 via-emerald-600 to-teal-500" />
            <MetricCard label="有效阅读" value={formatNumber(interactionTotals.qualifiedRead)} note={`完成率 ${formatPercent(interactionTotals.qualifiedRead, interactionTotals.articleEnter)}`} toneClass="from-violet-700 via-fuchsia-600 to-purple-500" />
            <MetricCard label="新增互动" value={formatNumber(interactionTotals.interactions)} note={`赞 ${formatNumber(interactionTotals.likes)} · 转 ${formatNumber(interactionTotals.shares)} · 评 ${formatNumber(interactionTotals.comments)}`} toneClass="from-rose-700 via-pink-600 to-orange-500" />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {overviewInsights.map(item => (
              <InsightCard
                key={item.eyebrow}
                eyebrow={item.eyebrow}
                title={item.title}
                description={item.description}
              />
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <TimelineChartCard
              title="访问趋势"
              description="按当前时间范围自动切小时 / 天，能直接看出访问高峰是不是来自真实流量。"
              points={trafficTrendPoints}
              toneClass="from-sky-500 via-cyan-400 to-emerald-400"
              valueNote={`访客 ${formatNumber(trafficVisitorsTotal)} · 文章页 ${formatNumber(trafficArticleViewsTotal)}`}
            />
            <TimelineChartCard
              title="互动趋势"
              description="把点赞、转发、评论合并成一条趋势线，方便看内容有没有真正带动反馈。"
              points={engagementTrendPoints}
              toneClass="from-violet-500 via-fuchsia-400 to-rose-400"
              valueNote={`有效阅读 ${formatNumber(engagementQualifiedTotal)} · 互动 ${formatNumber(interactionTotals.interactions)}`}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
            <SegmentBarCard
              title="流量来源结构"
              description={`现在改成互斥口径：直接访问、站外引流、站内流转。文章页访问 ${formatPercent(siteMetrics.articlePv, siteMetrics.pv)} 作为质量补充单独看。`}
              segments={trafficSourceSegments}
            />
            <BarListChartCard
              title="地区热度"
              description="优先看真实访问集中在哪些地区，方便判断是不是某篇内容被外部扩散了。"
              items={topRegions}
              emptyText="当前范围还没有可识别的地区数据。"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <SectionCard className="px-5 py-5 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">访客质量速读</h2>
                  <p className="mt-1 text-xs text-slate-400">
                    这里优先看真实 IP、回访比例和浏览深度，不让你被自己的调试流量带偏。
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <CompactStat label="真实 IP" value={formatNumber(knownVisitorCount)} note={`占比 ${formatPercent(knownVisitorCount, totalVisitorBuckets)}`} />
                <CompactStat label="未知访客" value={formatNumber(unknownVisitorCount)} note={`占比 ${formatPercent(unknownVisitorCount, totalVisitorBuckets)}`} />
                <CompactStat label="回访访客" value={formatNumber(visitorQuality.returningIpCount)} note={`占比 ${formatPercent(visitorQuality.returningIpCount, totalVisitorBuckets)}`} />
                <CompactStat label="一次即走" value={formatNumber(visitorQuality.singleVisitIpCount)} note={`占比 ${formatPercent(visitorQuality.singleVisitIpCount, totalVisitorBuckets)}`} />
                <CompactStat label="平均会话" value={formatDecimal(visitorQuality.avgSessionsPerIp)} note="每个访客平均触发的会话数" />
                <CompactStat label="平均浏览页数" value={formatDecimal(visitorQuality.avgViewsPerIp)} note={`主力设备 ${topDeviceEntry?.[0] || '待识别'}`} />
              </div>
            </SectionCard>

            <BarListChartCard
              title="来源 Top"
              description="快速看哪些入口最稳定地把人带到站里。"
              items={topReferrers}
              emptyText="当前范围没有可识别的来源记录。"
            />
          </div>
        </>
      ) : null}

      {selectedTab === 'mascot' ? (
        <>
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <SectionCard className="px-5 py-5 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Digital Twin</p>
                  <h2 className="mt-2 text-sm font-semibold text-slate-800">数字分身运行概览</h2>
                  <p className="mt-1 text-xs text-slate-400">把会话量、成功率和模型健康状态单独看，方便判断现在是不是在稳定回应访客。</p>
                </div>
                <Link href="/houtai/settings?section=ai" className="text-xs text-slate-400 transition hover:text-slate-600">
                  去 AI 设置 →
                </Link>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <CompactStat label="会话总数" value={formatNumber(mascotMetrics.totalChats)} note={`访客 ${formatNumber(mascotMetrics.uniqueVisitors)} 人`} />
                <CompactStat label="成功率" value={mascotSuccessRate} note={`成功 ${formatNumber(mascotMetrics.successCount)} 次`} />
                <CompactStat label="降级率" value={mascotFallbackRate} note={`降级 ${formatNumber(mascotMetrics.fallbackCount)} 次`} />
                <CompactStat label="平均延迟" value={formatLatency(mascotMetrics.avgLatencyMs)} note={`提问 ${formatNumber(mascotMetrics.avgMessageChars ?? 0)} 字 / 回复 ${formatNumber(mascotMetrics.avgReplyChars ?? 0)} 字`} />
                <CompactStat label="当前模型" value={mascotTopModel} note={`模式 ${mascotRecentRows[0]?.mode === 'pet' ? '宠物' : '数字分身'}`} />
                <CompactStat
                  label="健康状态"
                  value={mascotHealthStatus}
                  note={mascotHealth.lastSuccessAt ? `最近成功 ${formatDateTime(mascotHealth.lastSuccessAt)}` : '还没有成功回复记录'}
                />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <CompactStat label="最近失败" value={mascotHealth.lastFailureAt ? formatDateTime(mascotHealth.lastFailureAt) : '—'} note="可快速判断是不是刚出过故障" />
                <CompactStat label="鉴权 / 余额" value={`${formatNumber(mascotHealth.authErrors)} / ${formatNumber(mascotHealth.balanceErrors)}`} note="API Key 或余额问题" />
                <CompactStat label="限流 / 网络" value={`${formatNumber(mascotHealth.rateLimitErrors)} / ${formatNumber(mascotHealth.networkErrors)}`} note="接口拥堵或网络波动" />
              </div>
            </SectionCard>

            <div className="grid gap-6">
              <RankListCard title="高频提问" items={mascotQuestions} />
              <RankListCard title="分身异常分布" items={mascotErrors} />
            </div>
          </div>

          <SectionCard>
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-800">最近分身对话</h2>
              <p className="mt-1 text-xs text-slate-400">这里只记录真实访客会话；站长白名单、自测流量和后台试聊都不会混进来。</p>
            </div>
            <div className="divide-y divide-slate-100">
              {mascotRecentRows.length === 0 ? (
                <p className="px-5 py-12 text-sm text-slate-400">当前范围还没有数字分身对话记录。</p>
              ) : (
                mascotRecentRows.map(item => (
                  <div key={item.id} className="flex items-start justify-between gap-4 px-5 py-4 transition hover:bg-slate-50/80">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${item.success ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                          {item.success ? '回复成功' : '降级回复'}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                          {item.mode === 'pet' ? '宠物模式' : '数字分身'}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500">
                          {item.model || '未记录模型'}
                        </span>
                        {!item.success && item.errorType ? (
                          <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">
                            {getMascotErrorLabel(item.errorType)}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-3 text-sm font-medium text-slate-800">问：{truncateText(item.message, 160)}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-500">答：{truncateText(item.reply, 220)}</p>
                      <p className="mt-2 text-xs text-slate-400">
                        {item.displayIp} · {item.displayLocation} · {item.displayPath}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">{item.deviceProfile.summary}</p>
                      {item.deviceProfile.detail ? <p className="mt-1 text-xs text-slate-400">{item.deviceProfile.detail}</p> : null}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-700">{formatLatency(item.latencyMs)}</p>
                      <p className="mt-1 text-xs text-slate-400">{formatDateTime(item.createdAt)}</p>
                      <div className="mt-2 flex flex-col items-end gap-2">
                        <Link
                          href={item.path || '/'}
                          target="_blank"
                          className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                        >
                          打开页面
                        </Link>
                        <Link
                          href={buildAnalyticsHref(rangeState.key, deviceState, item.displayIp, selfState, 'visitors')}
                          className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                        >
                          查看这条 IP
                        </Link>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </>
      ) : null}

      {selectedTab === 'content' ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="文章进入" value={formatNumber(interactionTotals.articleEnter)} note={`当前范围 ${selectedRangeLabel}`} toneClass="from-slate-800 via-slate-700 to-slate-600" />
            <MetricCard label="有效阅读" value={formatNumber(interactionTotals.qualifiedRead)} note={`完成率 ${formatPercent(interactionTotals.qualifiedRead, interactionTotals.articleEnter)}`} toneClass="from-violet-700 via-indigo-600 to-sky-500" />
            <MetricCard label="转发" value={formatNumber(interactionTotals.shares)} note={`占总互动 ${shareRate}`} toneClass="from-amber-600 via-orange-500 to-rose-500" />
            <MetricCard label="评论" value={formatNumber(interactionTotals.comments)} note={`点赞 ${formatNumber(interactionTotals.likes)} · 总互动 ${formatNumber(interactionTotals.interactions)}`} toneClass="from-emerald-700 via-teal-600 to-cyan-500" />
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
              <RankListCard title="高频页面" items={topPages} />
              <RankListCard title="来源 Top" items={topReferrers} />
            </div>
          </div>

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
        </>
      ) : null}

      {selectedTab === 'visitors' ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="独立访客" value={formatNumber(siteMetrics.uv)} note={`识别到 ${formatNumber(siteMetrics.uniqueIp)} 个访问 IP`} toneClass="from-sky-700 via-cyan-600 to-teal-500" />
            <MetricCard label="真实 IP" value={formatNumber(knownVisitorCount)} note={`未知访客 ${formatNumber(unknownVisitorCount)}`} toneClass="from-emerald-700 via-emerald-600 to-lime-500" />
            <MetricCard label="回访访客" value={formatNumber(visitorQuality.returningIpCount)} note={`一次即走 ${formatNumber(visitorQuality.singleVisitIpCount)}`} toneClass="from-violet-700 via-fuchsia-600 to-pink-500" />
            <MetricCard
              label={selectedIp ? '当前追踪' : '平均浏览深度'}
              value={selectedIp ? selectedIp : `${formatDecimal(visitorQuality.avgViewsPerIp)} 页`}
              note={
                selectedIp
                  ? selectedIpSummary
                    ? `${formatLocation(selectedIpSummary.ipRegion, selectedIpSummary.ipCity)} · ${formatNumber(selectedIpSummary.uniquePaths)} 个页面`
                    : '当前筛选下还没有这条 IP 的访问摘要'
                  : `平均 ${formatDecimal(visitorQuality.avgSessionsPerIp)} 次会话 · ${topDeviceEntry?.[0] || '设备待识别'}`
              }
              toneClass="from-slate-800 via-slate-700 to-slate-600"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
            <SegmentBarCard
              title="真实访客结构"
              description="把可识别真实 IP 和未知访客拆开看，先判断这批统计是不是足够干净。"
              segments={realIpSegments}
            />
            <SectionCard className="px-5 py-5 sm:px-6">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">{selectedIp ? '当前 IP 摘要' : '当前筛选速读'}</h2>
                <p className="mt-1 text-xs text-slate-400">
                  {selectedIp ? '锁定单个 IP 后，先看访问密度、页面数和地区，再决定要不要继续追踪轨迹。' : '这里把设备、范围和最值得继续追的信号先收拢到一块。'}
                </p>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {selectedIp ? (
                  <>
                    <CompactStat label="追踪 IP" value={selectedIp} note={selectedIpSummary ? formatLocation(selectedIpSummary.ipRegion, selectedIpSummary.ipCity) : '地区待识别'} />
                    <CompactStat label="访问次数" value={formatNumber(selectedIpSummary?.views ?? 0)} note={`会话 ${formatNumber(selectedIpSummary?.sessions ?? 0)} 次`} />
                    <CompactStat label="访问页面" value={formatNumber(selectedIpSummary?.uniquePaths ?? 0)} note={`平均停留 ${formatDuration(selectedIpSummary?.avgDuration ?? 0)}`} />
                    <CompactStat label="首次出现" value={selectedIpSummary?.firstSeen ? formatDateTime(selectedIpSummary.firstSeen) : '—'} />
                    <CompactStat label="最近出现" value={selectedIpSummary?.lastSeen ? formatDateTime(selectedIpSummary.lastSeen) : '—'} />
                    <CompactStat label="设备筛选" value={selectedDeviceLabel} note={selectedRangeLabel} />
                  </>
                ) : (
                  <>
                    <CompactStat label="设备筛选" value={selectedDeviceLabel} note="可随时切换手机 / 桌面 / 爬虫" />
                    <CompactStat label="查看范围" value={selectedRangeLabel} note={rangeText} />
                    <CompactStat label="主力浏览器" value={topBrowserEntry?.[0] || '待识别'} note={`系统 ${topOsEntry?.[0] || '待识别'}`} />
                    <CompactStat label="主力设备" value={topDeviceEntry?.[0] || '待识别'} note={`占比 ${topDeviceEntry ? formatPercent(topDeviceEntry[1], siteMetrics.pv) : '—'}`} />
                    <CompactStat label="热点地区" value={topRegions[0]?.label || '地区待识别'} note={topRegions[0]?.meta || '等更多真实访问后会更准'} />
                    <CompactStat label="建议追踪 IP" value={visitorIpLeaderboard[0]?.label || '暂无'} note={visitorIpLeaderboard[0]?.meta || '当前还没有足够密集的访问'} />
                  </>
                )}
              </div>
            </SectionCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <BarListChartCard title="设备分布" description="按设备类型汇总，快速看手机、桌面和平板谁更活跃。" items={deviceBreakdown} emptyText="当前范围没有设备类型数据。" />
            <BarListChartCard title="浏览器排行" description="看访客主要用什么浏览器进站，排查兼容问题会更直观。" items={topBrowsers} emptyText="当前范围没有浏览器数据。" />
            <BarListChartCard title="系统排行" description="系统分布能帮助你判断问题更集中在 iOS、Android 还是桌面端。" items={topOperatingSystems} emptyText="当前范围没有系统数据。" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <SectionCard>
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-sm font-semibold text-slate-800">详细访客榜</h2>
                <p className="mt-1 text-xs text-slate-400">优先展示真实 IP 的访问密度、设备和停留情况，匿名访客会在上面的结构里单独统计。</p>
              </div>
              <div className="divide-y divide-slate-100">
                {visitorLeaderboard.length === 0 ? (
                  <p className="px-5 py-12 text-sm text-slate-400">当前范围还没有可展示的访客数据。</p>
                ) : (
                  visitorLeaderboard.map(item => (
                    <div
                      key={`${item.displayIp}-${toTimestamp(item.lastSeen)}-${item.sessions}`}
                      className="flex items-start justify-between gap-4 px-5 py-4 transition hover:bg-slate-50/80"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                            {item.displayLocation}
                          </span>
                          <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 font-mono text-[11px] text-slate-500">
                            {item.displayIp}
                          </span>
                        </div>
                        <p className="mt-3 text-sm font-medium text-slate-800">{item.deviceProfile.summary}</p>
                        {item.deviceProfile.detail ? <p className="mt-1 text-xs text-slate-400">{item.deviceProfile.detail}</p> : null}
                        <p className="mt-2 text-xs text-slate-400">
                          会话 {formatNumber(item.sessions)} 次 · 页面 {formatNumber(item.uniquePaths)} 个 · 设备 {formatNumber(item.deviceCount)} 台
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          首访 {formatDateTime(item.firstSeen)} · 最近 {formatDateTime(item.lastSeen)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-semibold text-slate-900">{formatNumber(item.views)}</p>
                        <p className="mt-1 text-xs text-slate-400">总访问</p>
                        <p className="mt-3 text-xs text-slate-400">平均停留 {formatDuration(item.avgDuration)}</p>
                        <Link
                          href={item.traceHref}
                          className="mt-3 inline-flex rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                        >
                          查看轨迹
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </SectionCard>

            <div className="grid gap-6">
              <RankListCard title="高频 IP" items={visitorIpLeaderboard} />
              <BarListChartCard
                title="地区热度"
                description="按访问量汇总地区，看看真实流量主要落在哪些地方。"
                items={topRegions}
                emptyText="当前范围还没有可识别的地区数据。"
              />
            </div>
          </div>

          {selectedIp ? (
            <SectionCard>
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-sm font-semibold text-slate-800">单个 IP 访问轨迹</h2>
                <p className="mt-1 text-xs text-slate-400">按时间倒序展示这个 IP 在当前筛选条件下的访问路径和来源。</p>
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
        </>
      ) : null}
    </div>
  )
}
