import { Prisma } from '@prisma/client'

import { buildOwnerTrafficExcludeSql } from '@/lib/analytics-traffic'
import { prisma } from '@/lib/prisma'
import {
  buildDeviceFilterSql,
  buildIpFilterSql,
  buildTimeBucketSql,
  safeDecode,
} from '@/components/houtai/admin-analytics-helpers'
import type {
  AdminAnalyticsQueryContext,
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

async function fetchMascotAnalyticsRawData({ mascotBaseSql }: AdminAnalyticsQueryContext) {
  try {
    const [
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

    return {
      mascotMetricsResult,
      mascotQuestionRowsRaw,
      mascotErrorRowsRaw,
      mascotModelRowsRaw,
      mascotHealthRowsRaw,
      mascotRecentRowsRaw,
    }
  } catch (error) {
    console.error('[analytics] mascot chat stats unavailable:', error)

    return {
      mascotMetricsResult: [] as MascotMetricsRow[],
      mascotQuestionRowsRaw: [] as MascotQuestionRow[],
      mascotErrorRowsRaw: [] as MascotErrorRow[],
      mascotModelRowsRaw: [] as MascotModelRow[],
      mascotHealthRowsRaw: [] as MascotHealthRow[],
      mascotRecentRowsRaw: [] as MascotRecentRow[],
    }
  }
}

export async function fetchAdminAnalyticsRawData(context: AdminAnalyticsQueryContext) {
  const {
    currentVisitorIp,
    deviceState,
    interactionBaseSql,
    mascotBaseSql,
    ownerTrafficRules,
    pageViewBaseSql,
    rangeState,
    recentInteractionWhere,
    selectedIp,
    shouldHideCurrentVisitor,
  } = context

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
    mascotRaw,
  ] = await Promise.all([
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
    fetchMascotAnalyticsRawData(context),
  ])

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

  return {
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
    pageArticles,
    rankedArticles,
    ...mascotRaw,
  }
}

export type AdminAnalyticsRawData = Awaited<ReturnType<typeof fetchAdminAnalyticsRawData>>
