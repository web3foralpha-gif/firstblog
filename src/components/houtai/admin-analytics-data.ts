import { Prisma } from '@prisma/client'

import {
  buildOwnerTrafficExcludeSql,
  getClientIpFromHeaders,
  getOwnerTrafficRules,
} from '@/lib/analytics-traffic'
import {
  type AnalyticsTabKey,
  type DeviceFilterKey,
  type SelfFilterKey,
  buildDeviceFilterSql,
  buildIpFilterSql,
  resolveDeviceFilter,
  resolveIpFilter,
  resolveRange,
  resolveSelfFilter,
  resolveTab,
} from '@/components/houtai/admin-analytics-helpers'
import { fetchAdminAnalyticsRawData } from '@/components/houtai/admin-analytics-queries'
import type { AdminAnalyticsQueryContext, PageProps } from '@/components/houtai/admin-analytics-types'
import { buildAdminAnalyticsPageViewModel } from '@/components/houtai/admin-analytics-view-model'

function buildAdminAnalyticsQueryContext({
  currentVisitorIp,
  deviceState,
  now,
  ownerTrafficRules,
  rangeState,
  selectedIp,
  selectedTab,
  selfState,
}: {
  currentVisitorIp: string | null
  deviceState: DeviceFilterKey
  now: Date
  ownerTrafficRules: Awaited<ReturnType<typeof getOwnerTrafficRules>>
  rangeState: ReturnType<typeof resolveRange>
  selectedIp: string | null
  selectedTab: AnalyticsTabKey
  selfState: SelfFilterKey
}): AdminAnalyticsQueryContext {
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
    deviceSignatureSql: '"deviceInfo"->>\'signature\'',
    rules: ownerTrafficRules,
  })
  const ownerInteractionSql = buildOwnerTrafficExcludeSql({
    ipColumn: '"ipAddress"',
    deviceSignatureSql: '"metadata"->\'deviceInfo\'->>\'signature\'',
    rules: ownerTrafficRules,
  })
  const ownerMascotSql = buildOwnerTrafficExcludeSql({
    ipColumn: '"ipAddress"',
    deviceSignatureSql: '"deviceInfo"->>\'signature\'',
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

  return {
    now,
    rangeState,
    deviceState,
    selectedIp,
    selfState,
    selectedTab,
    currentVisitorIp,
    ownerTrafficRules,
    shouldHideCurrentVisitor,
    pageViewBaseSql,
    interactionBaseSql,
    mascotBaseSql,
    recentInteractionWhere,
  }
}

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

  const context = buildAdminAnalyticsQueryContext({
    currentVisitorIp,
    deviceState,
    now,
    ownerTrafficRules,
    rangeState,
    selectedIp,
    selectedTab,
    selfState,
  })

  const rawData = await fetchAdminAnalyticsRawData(context)

  return buildAdminAnalyticsPageViewModel({ context, rawData })
}

export type AdminAnalyticsPageData = Awaited<ReturnType<typeof getAdminAnalyticsPageData>>
