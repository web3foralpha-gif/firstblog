import { describeDevice, parseUserAgent, sanitizeDeviceInfo } from '@/lib/device-info'
import { matchOwnerTraffic } from '@/lib/analytics-traffic'
import { type RankItem, type SegmentItem } from '@/components/houtai/admin-analytics-ui'
import {
  buildAnalyticsHref,
  extractMetadataDeviceInfo,
  extractMetadataDevicePayload,
  formatIpAddress,
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
  truncateText,
} from '@/components/houtai/admin-analytics-helpers'
import type { AdminAnalyticsRawData } from '@/components/houtai/admin-analytics-queries'
import type { AdminAnalyticsQueryContext } from '@/components/houtai/admin-analytics-types'

export function buildArticleLookups(rawData: AdminAnalyticsRawData) {
  const titleBySlug = new Map(rawData.pageArticles.map(article => [article.slug, article.title]))
  const articleById = new Map(rawData.rankedArticles.map(article => [article.id, article]))

  return {
    titleBySlug,
    articleById,
  }
}

export function buildReferrerRanks(rawReferrers: AdminAnalyticsRawData['rawReferrers'], totalViews: number) {
  const referrerMap = new Map<string, number>()

  for (const item of rawReferrers) {
    const key = normalizeReferrer(item.referrer)
    referrerMap.set(key, (referrerMap.get(key) ?? 0) + Number(item.views ?? 0))
  }

  return Array.from(referrerMap.entries())
    .map(([label, value]) => ({
      label,
      value,
      meta: `占比 ${formatPercent(value, totalViews)}`,
    }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 6) satisfies RankItem[]
}

export function buildDeviceBreakdowns(userAgentGroupsRaw: AdminAnalyticsRawData['userAgentGroupsRaw'], totalViews: number) {
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

  const buildRankList = (source: Map<string, number>) =>
    Array.from(source.entries())
      .map(([label, value]) => ({
        label,
        value,
        meta: `占比 ${formatPercent(value, totalViews)}`,
      }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 6)

  return {
    topDeviceEntry: Array.from(deviceTypeMap.entries()).sort((left, right) => right[1] - left[1])[0],
    topOsEntry: Array.from(osMap.entries()).sort((left, right) => right[1] - left[1])[0],
    topBrowserEntry: Array.from(browserMap.entries()).sort((left, right) => right[1] - left[1])[0],
    topBrowsers: buildRankList(browserMap) as RankItem[],
    topOperatingSystems: buildRankList(osMap) as RankItem[],
    deviceBreakdown: buildRankList(deviceTypeMap) as RankItem[],
  }
}

export function buildMascotTransforms({
  mascotMetrics,
  mascotErrorRowsRaw,
  mascotModelRowsRaw,
  mascotQuestionRowsRaw,
  mascotRecentRowsRaw,
  titleBySlug,
}: {
  mascotMetrics: {
    totalChats: number
    successCount: number
    fallbackCount: number
  }
  mascotErrorRowsRaw: AdminAnalyticsRawData['mascotErrorRowsRaw']
  mascotModelRowsRaw: AdminAnalyticsRawData['mascotModelRowsRaw']
  mascotQuestionRowsRaw: AdminAnalyticsRawData['mascotQuestionRowsRaw']
  mascotRecentRowsRaw: AdminAnalyticsRawData['mascotRecentRowsRaw']
  titleBySlug: Map<string, string>
}) {
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

  return {
    mascotSuccessRate,
    mascotFallbackRate,
    mascotTopModel,
    mascotHealthStatus,
    mascotQuestions: mascotQuestionRowsRaw.map(item => ({
      label: truncateText(item.message, 44) || '空问题',
      value: Number(item.count ?? 0),
      meta: `成功 ${formatPercent(Number(item.successCount ?? 0), Number(item.count ?? 0))}`,
    })) satisfies RankItem[],
    mascotErrors: mascotErrorRowsRaw.map(item => ({
      label: getMascotErrorLabel(item.errorType),
      value: Number(item.count ?? 0),
      meta: item.errorType,
    })) satisfies RankItem[],
    mascotRecentRows: mascotRecentRowsRaw.map(item => ({
      ...item,
      displayIp: formatIpAddress(item.ipAddress),
      displayLocation: formatLocation(item.ipRegion, item.ipCity),
      displayPath: item.path ? prettifyPath(item.path, titleBySlug) : '未记录页面',
      deviceProfile: describeDevice(item.userAgent, sanitizeDeviceInfo(item.deviceInfo)),
    })),
  }
}

export function buildVisitorTransforms({
  context,
  rawData,
  siteMetrics,
  visitorQuality,
  titleBySlug,
}: {
  context: AdminAnalyticsQueryContext
  rawData: AdminAnalyticsRawData
  siteMetrics: {
    pv: number
    directPv: number
    externalPv: number
  }
  visitorQuality: {
    knownIpCount: number
    unknownIpCount: number
  }
  titleBySlug: Map<string, string>
}) {
  const topRegions: RankItem[] = rawData.regionRowsRaw.map(item => ({
    label: item.regionLabel,
    value: Number(item.views ?? 0),
    meta: `${formatNumber(Number(item.visitors ?? 0))} 位访客`,
  }))

  const topIps: RankItem[] = rawData.topIpsRaw.map(item => ({
    label: formatIpAddress(item.ipAddress),
    value: Number(item.views ?? 0),
    meta: `${formatLocation(item.ipRegion, item.ipCity)} · ${describeDevice(item.userAgent).summary} · ${formatNumber(Number(item.sessions ?? 0))} 次会话`,
    href: buildAnalyticsHref(context.rangeState.key, context.deviceState, formatIpAddress(item.ipAddress), context.selfState, 'visitors'),
    highlighted: Boolean(context.selectedIp && context.selectedIp === formatIpAddress(item.ipAddress)),
  }))

  const detailedVisitors = rawData.detailedVisitorsRaw.map(item => ({
    ...item,
    displayIp: formatIpAddress(item.ipAddress),
    displayLocation: formatLocation(item.ipRegion, item.ipCity),
    deviceProfile: describeDevice(item.userAgent),
    traceHref: buildAnalyticsHref(context.rangeState.key, context.deviceState, formatIpAddress(item.ipAddress), context.selfState, 'visitors'),
  }))

  const recentVisits = groupRecentVisits(
    rawData.recentVisitsRaw.map(item => ({
      ...item,
      displayPath: prettifyPath(item.path, titleBySlug),
      displayIp: formatIpAddress(item.ipAddress),
      displayLocation: formatLocation(item.ipRegion, item.ipCity),
      displayReferrer: normalizeReferrer(item.referrer || ''),
      deviceProfile: describeDevice(item.userAgent, sanitizeDeviceInfo(item.deviceInfo)),
      traceHref: buildAnalyticsHref(context.rangeState.key, context.deviceState, formatIpAddress(item.ipAddress), context.selfState, 'visitors'),
    })),
  ).slice(0, 8)

  const ipTraceRows = rawData.ipTraceRaw.map(item => ({
    ...item,
    displayPath: prettifyPath(item.path, titleBySlug),
    displayReferrer: normalizeReferrer(item.referrer || ''),
    deviceProfile: describeDevice(item.userAgent, sanitizeDeviceInfo(item.deviceInfo)),
  }))

  const recentInteractionRows = groupRecentInteractions(
    rawData.recentInteractionsRaw
      .filter(item => !matchOwnerTraffic({
        ipAddress: item.ipAddress,
        userAgent: item.userAgent,
        deviceInfo: extractMetadataDeviceInfo(item.metadata),
      }, context.ownerTrafficRules).matched)
      .filter(item => matchesDeviceFilter(item.userAgent, context.deviceState))
      .filter(item => matchesIpFilter(item.ipAddress, context.selectedIp))
      .map(item => ({
        ...item,
        deviceProfile: describeDevice(item.userAgent, extractMetadataDevicePayload(item.metadata)),
      })),
  ).slice(0, 10)

  const knownVisitorCount = Number(visitorQuality.knownIpCount ?? 0)
  const unknownVisitorCount = Number(visitorQuality.unknownIpCount ?? 0)
  const totalVisitorBuckets = knownVisitorCount + unknownVisitorCount
  const realTopIps = topIps.filter(item => item.label !== '未知 IP')
  const realDetailedVisitors = detailedVisitors.filter(item => item.displayIp !== '未知 IP')

  return {
    knownVisitorCount,
    unknownVisitorCount,
    totalVisitorBuckets,
    topRegions,
    visitorIpLeaderboard: realTopIps.length > 0 ? realTopIps : topIps,
    visitorLeaderboard: realDetailedVisitors.length > 0 ? realDetailedVisitors : detailedVisitors,
    recentVisits,
    recentInteractionRows,
    ipTraceRows,
    trafficSourceSegments: [
      { label: '直接访问', value: Number(siteMetrics.directPv ?? 0), tone: 'bg-slate-500' },
      { label: '站外来源', value: Number(siteMetrics.externalPv ?? 0), tone: 'bg-sky-500' },
      {
        label: '站内流转',
        value: Math.max(Number(siteMetrics.pv ?? 0) - Number(siteMetrics.directPv ?? 0) - Number(siteMetrics.externalPv ?? 0), 0),
        tone: 'bg-emerald-500',
      },
    ] satisfies SegmentItem[],
    realIpSegments: [
      { label: '真实 IP', value: knownVisitorCount, tone: 'bg-emerald-500' },
      { label: '未知访客', value: unknownVisitorCount, tone: 'bg-amber-400' },
    ] satisfies SegmentItem[],
  }
}

export function buildContentRows(rawData: AdminAnalyticsRawData, articleById: Map<string, { title: string; accessType: string; published: boolean; updatedAt: Date | null }>) {
  return rawData.articlePerformanceRaw.map(row => {
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
}
