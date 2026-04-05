import type { Prisma } from '@prisma/client'

export type PageProps = {
  searchParams: Promise<{ range?: string | string[]; device?: string | string[]; ip?: string | string[]; self?: string | string[]; tab?: string | string[] }>
}

export type SiteMetricsRow = {
  pv: number
  uv: number
  uniqueIp: number
  articlePv: number
  directPv: number
  externalPv: number
  avgDuration: number | null
  articleAvgDuration: number | null
}

export type TrafficTrendRow = {
  bucket: Date | string
  views: number
  visitors: number
  articleViews: number
}

export type EngagementTrendRow = {
  bucket: Date | string
  qualifiedReads: number
  interactions: number
}

export type TopPageRow = {
  path: string
  views: number
  avgDuration: number | null
}

export type ReferrerRow = {
  referrer: string
  views: number
}

export type RegionRow = {
  regionLabel: string
  views: number
  visitors: number
}

export type InteractionTotalsRow = {
  articleEnter: number
  qualifiedRead: number
  likes: number
  shares: number
  comments: number
  interactions: number
}

export type ArticlePerformanceRow = {
  articleId: string
  enters: number
  qualified: number
  likes: number
  shareLink: number
  shareImage: number
  comments: number
  visitors: number
}

export type TopIpRow = {
  ipAddress: string | null
  ipRegion: string | null
  ipCity: string | null
  views: number
  sessions: number
  lastSeen: Date | string
  userAgent: string | null
}

export type RecentVisitRow = {
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

export type UserAgentAggregateRow = {
  userAgent: string | null
  views: number
}

export type IpTraceRow = {
  id: string
  sessionId: string
  path: string
  enteredAt: Date | string
  duration: number | null
  referrer: string | null
  userAgent: string | null
  deviceInfo: Prisma.JsonValue | null
}

export type MascotMetricsRow = {
  totalChats: number
  uniqueVisitors: number
  successCount: number
  fallbackCount: number
  avgLatencyMs: number | null
  avgMessageChars: number | null
  avgReplyChars: number | null
}

export type MascotQuestionRow = {
  message: string
  count: number
  successCount: number
}

export type MascotErrorRow = {
  errorType: string
  count: number
}

export type MascotModelRow = {
  model: string | null
  count: number
}

export type MascotHealthRow = {
  lastSuccessAt: Date | string | null
  lastFailureAt: Date | string | null
  authErrors: number
  rateLimitErrors: number
  balanceErrors: number
  networkErrors: number
  emptyReplyErrors: number
  providerErrors: number
}

export type MascotRecentRow = {
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

export type VisitorQualityRow = {
  knownIpCount: number
  unknownIpCount: number
  returningIpCount: number
  singleVisitIpCount: number
  avgSessionsPerIp: number | null
  avgViewsPerIp: number | null
}

export type DetailedVisitorRow = {
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

export type SelectedIpSummaryRow = {
  views: number
  sessions: number
  uniquePaths: number
  avgDuration: number | null
  firstSeen: Date | string | null
  lastSeen: Date | string | null
  ipRegion: string | null
  ipCity: string | null
}


