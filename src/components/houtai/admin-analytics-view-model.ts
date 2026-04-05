import { formatDateTime } from '@/lib/utils'
import {
  ANALYTICS_TABS,
  DEVICE_OPTIONS,
  RANGE_OPTIONS,
  buildTimelinePoints,
  formatDuration,
  formatNumber,
  formatPercent,
  prettifyPath,
  truncateText,
} from '@/components/houtai/admin-analytics-helpers'
import type { AdminAnalyticsRawData } from '@/components/houtai/admin-analytics-queries'
import {
  buildArticleLookups,
  buildContentRows,
  buildDeviceBreakdowns,
  buildMascotTransforms,
  buildReferrerRanks,
  buildVisitorTransforms,
} from '@/components/houtai/admin-analytics-transforms'
import type { AdminAnalyticsQueryContext } from '@/components/houtai/admin-analytics-types'

export function buildAdminAnalyticsPageViewModel({
  context,
  rawData,
}: {
  context: AdminAnalyticsQueryContext
  rawData: AdminAnalyticsRawData
}) {
  const siteMetrics = rawData.siteMetricsResult[0] ?? {
    pv: 0,
    uv: 0,
    uniqueIp: 0,
    articlePv: 0,
    directPv: 0,
    externalPv: 0,
    avgDuration: 0,
    articleAvgDuration: 0,
  }

  const interactionTotals = rawData.interactionTotalsResult[0] ?? {
    articleEnter: 0,
    qualifiedRead: 0,
    likes: 0,
    shares: 0,
    comments: 0,
    interactions: 0,
  }

  const mascotMetrics = rawData.mascotMetricsResult[0] ?? {
    totalChats: 0,
    uniqueVisitors: 0,
    successCount: 0,
    fallbackCount: 0,
    avgLatencyMs: 0,
    avgMessageChars: 0,
    avgReplyChars: 0,
  }

  const mascotHealth = rawData.mascotHealthRowsRaw[0] ?? {
    lastSuccessAt: null,
    lastFailureAt: null,
    authErrors: 0,
    rateLimitErrors: 0,
    balanceErrors: 0,
    networkErrors: 0,
    emptyReplyErrors: 0,
    providerErrors: 0,
  }

  const visitorQuality = rawData.visitorQualityResult[0] ?? {
    knownIpCount: 0,
    unknownIpCount: 0,
    returningIpCount: 0,
    singleVisitIpCount: 0,
    avgSessionsPerIp: 0,
    avgViewsPerIp: 0,
  }

  const selectedIpSummary = rawData.selectedIpSummaryResult[0] ?? null
  const { titleBySlug, articleById } = buildArticleLookups(rawData)

  const topPages = rawData.topPagesRaw.map(item => ({
    label: prettifyPath(item.path, titleBySlug),
    value: Number(item.views ?? 0),
    meta: `平均停留 ${formatDuration(Number(item.avgDuration ?? 0))}`,
    href: item.path,
  }))

  const topReferrers = buildReferrerRanks(rawData.rawReferrers, siteMetrics.pv)
  const {
    topDeviceEntry,
    topOsEntry,
    topBrowserEntry,
    topBrowsers,
    topOperatingSystems,
    deviceBreakdown,
  } = buildDeviceBreakdowns(rawData.userAgentGroupsRaw, siteMetrics.pv)
  const {
    mascotSuccessRate,
    mascotFallbackRate,
    mascotTopModel,
    mascotHealthStatus,
    mascotQuestions,
    mascotErrors,
    mascotRecentRows,
  } = buildMascotTransforms({
    mascotMetrics,
    mascotErrorRowsRaw: rawData.mascotErrorRowsRaw,
    mascotModelRowsRaw: rawData.mascotModelRowsRaw,
    mascotQuestionRowsRaw: rawData.mascotQuestionRowsRaw,
    mascotRecentRowsRaw: rawData.mascotRecentRowsRaw,
    titleBySlug,
  })
  const {
    knownVisitorCount,
    unknownVisitorCount,
    totalVisitorBuckets,
    topRegions,
    visitorIpLeaderboard,
    visitorLeaderboard,
    recentVisits,
    recentInteractionRows,
    ipTraceRows,
    trafficSourceSegments,
    realIpSegments,
  } = buildVisitorTransforms({
    context,
    rawData,
    siteMetrics,
    visitorQuality,
    titleBySlug,
  })

  const articleRows = buildContentRows(rawData, articleById)
  const trafficTrendPoints = buildTimelinePoints(
    rawData.trafficTrendRaw.map(item => ({ bucket: item.bucket, value: Number(item.views ?? 0) })),
    context.rangeState.key,
    context.now,
    context.rangeState.from,
  )
  const engagementTrendPoints = buildTimelinePoints(
    rawData.engagementTrendRaw.map(item => ({ bucket: item.bucket, value: Number(item.interactions ?? 0) })),
    context.rangeState.key,
    context.now,
    context.rangeState.from,
  )
  const trafficVisitorsTotal = rawData.trafficTrendRaw.reduce((sum, item) => sum + Number(item.visitors ?? 0), 0)
  const trafficArticleViewsTotal = rawData.trafficTrendRaw.reduce((sum, item) => sum + Number(item.articleViews ?? 0), 0)
  const engagementQualifiedTotal = rawData.engagementTrendRaw.reduce((sum, item) => sum + Number(item.qualifiedReads ?? 0), 0)
  const rangeText = context.rangeState.from
    ? `${formatDateTime(context.rangeState.from)} - ${formatDateTime(context.now)}`
    : `全部历史（截止 ${formatDateTime(context.now)}）`
  const selectedRangeLabel = RANGE_OPTIONS.find(option => option.key === context.rangeState.key)?.label ?? '7 天'
  const selectedDeviceLabel = DEVICE_OPTIONS.find(option => option.key === context.deviceState)?.label ?? '全部设备'
  const directRate = formatPercent(siteMetrics.directPv, siteMetrics.pv)
  const externalRate = formatPercent(siteMetrics.externalPv, siteMetrics.pv)
  const interactionRate = formatPercent(interactionTotals.interactions, interactionTotals.articleEnter)
  const shareRate = formatPercent(interactionTotals.shares, interactionTotals.interactions)
  const topArticle = articleRows[0]
  const activeTabMeta = ANALYTICS_TABS.find(option => option.key === context.selectedTab) ?? ANALYTICS_TABS[0]
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
      description: context.selectedIp ? `当前已锁定 ${context.selectedIp}` : '看 IP、设备来源和访问轨迹。',
      value: context.selectedIp ? '单 IP 轨迹' : `${formatNumber(siteMetrics.uniqueIp)} 个访问 IP`,
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
    now: context.now,
    rangeState: context.rangeState,
    deviceState: context.deviceState,
    selectedIp: context.selectedIp,
    selfState: context.selfState,
    selectedTab: context.selectedTab,
    currentVisitorIp: context.currentVisitorIp,
    ownerTrafficRules: context.ownerTrafficRules,
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
