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
import { type RankItem, type SegmentItem } from '@/components/houtai/admin-analytics-ui'
import {
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
  formatDecimal,
  formatDuration,
  formatIpAddress,
  formatLatency,
  formatLocation,
  formatNumber,
  formatPercent,
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
} from '@/components/houtai/admin-analytics-helpers'
import type {
  ArticlePerformanceRow,
  DetailedVisitorRow,
  EngagementTrendRow,
  InteractionTotalsRow,
  IpTraceRow,
  MascotErrorRow,
  MascotHealthRow,
  MascotMetricsRow,
  MascotModelRow,
  MascotQuestionRow,
  MascotRecentRow,
  PageProps,
  RecentVisitRow,
  ReferrerRow,
  RegionRow,
  SelectedIpSummaryRow,
  SiteMetricsRow,
  TopIpRow,
  TopPageRow,
  TrafficTrendRow,
  UserAgentAggregateRow,
  VisitorQualityRow,
} from '@/components/houtai/admin-analytics-types'

export async function getAdminAnalyticsPageData({
  searchParams,
  requestHeaders,
}: {
  searchParams: PageProps['searchParams']
  requestHeaders: Headers
}) {
  const { range, device, ip, self, tab } = await searchParams
  const now = new Date()
  const rangeState = resolveRange(range)
  const deviceState = resolveDeviceFilter(device)
  const selectedIp = resolveIpFilter(ip)
  const selfState = resolveSelfFilter(self)
  const selectedTab = resolveTab(tab)
  const currentVisitorIp = getClientIpFromHeaders(requestHeaders)
  const ownerTrafficRules = await getOwnerTrafficRules()
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

  return {
    now,
    rangeState,
    deviceState,
    selectedIp,
    selfState,
    selectedTab,
    currentVisitorIp,
    ownerTrafficRules,
    siteMetrics,
    interactionTotals,
    mascotMetrics,
    mascotHealth,
    visitorQuality,
    selectedIpSummary,
    topPages,
    topReferrers,
    topBrowsers,
    topOperatingSystems,
    deviceBreakdown,
    mascotSuccessRate,
    mascotFallbackRate,
    mascotTopModel,
    mascotHealthStatus,
    mascotQuestions,
    mascotErrors,
    mascotRecentRows,
    trafficTrendPoints,
    engagementTrendPoints,
    trafficVisitorsTotal,
    trafficArticleViewsTotal,
    engagementQualifiedTotal,
    knownVisitorCount,
    unknownVisitorCount,
    totalVisitorBuckets,
    trafficSourceSegments,
    realIpSegments,
    topRegions,
    visitorIpLeaderboard,
    visitorLeaderboard,
    articleRows,
    recentVisits,
    recentInteractionRows,
    ipTraceRows,
    rangeText,
    selectedRangeLabel,
    selectedDeviceLabel,
    directRate,
    externalRate,
    interactionRate,
    shareRate,
    topArticle,
    activeTabMeta,
    analyticsTabCards,
    overviewInsights,
    topDeviceEntry,
    topOsEntry,
    topBrowserEntry,
  }
}
