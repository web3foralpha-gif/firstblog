import { prisma } from '@/lib/prisma'
import { getDayRangeInTimeZone } from '@/lib/utils'

export type AdminDashboardRecentArticle = {
  id: string
  slug: string
  title: string
  mood: string | null
  pinned: boolean
  accessType: string
  createdAt: Date
  published: boolean
  commentCount: number
}

export type AdminDashboardData = {
  articleCount: number
  draftCount: number
  mascotChatsToday: number
  mascotFailureToday: number
  mascotSuccessRate: string
  pageViewsToday: number
  pendingComments: number
  pendingGuestbook: number
  pendingTotal: number
  recentArticles: AdminDashboardRecentArticle[]
  revenueCents: number
  sunflowerTotalCount: number
  todayPublished: number
  yesterdayPublished: number
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const todayRange = getDayRangeInTimeZone()
  const yesterdayRange = getDayRangeInTimeZone(new Date(Date.now() - 24 * 60 * 60 * 1000))

  const [
    sunflowerState,
    articleCount,
    draftCount,
    pendingComments,
    pendingGuestbook,
    totalRevenue,
    recentArticles,
    pageViewsToday,
    mascotChatsToday,
    mascotSuccessToday,
    todayPublished,
    yesterdayPublished,
  ] = await Promise.all([
    prisma.sunflowerState.findUnique({ where: { id: 'singleton' } }),
    prisma.article.count({ where: { published: true } }),
    prisma.article.count({ where: { published: false } }),
    prisma.comment.count({ where: { status: 'PENDING' } }),
    prisma.guestbook.count({ where: { status: 'PENDING' } }),
    prisma.payment.aggregate({ where: { status: 'COMPLETED' }, _sum: { amount: true } }),
    prisma.article.findMany({
      orderBy: [{ pinned: 'desc' }, { pinnedAt: 'desc' }, { createdAt: 'desc' }],
      take: 4,
      select: {
        id: true,
        slug: true,
        title: true,
        mood: true,
        pinned: true,
        accessType: true,
        createdAt: true,
        published: true,
        _count: { select: { comments: true } },
      },
    }),
    prisma.pageView.count({ where: { enteredAt: { gte: todayRange.start, lt: todayRange.end } } }).catch(() => 0),
    prisma.mascotChatLog.count({ where: { createdAt: { gte: todayRange.start, lt: todayRange.end } } }).catch(() => 0),
    prisma.mascotChatLog.count({
      where: {
        createdAt: { gte: todayRange.start, lt: todayRange.end },
        success: true,
      },
    }).catch(() => 0),
    prisma.article.count({ where: { published: true, createdAt: { gte: todayRange.start, lt: todayRange.end } } }),
    prisma.article.count({ where: { published: true, createdAt: { gte: yesterdayRange.start, lt: yesterdayRange.end } } }),
  ])

  const pendingTotal = pendingComments + pendingGuestbook
  const revenueCents = totalRevenue?._sum?.amount ?? 0
  const mascotFailureToday = Math.max(0, mascotChatsToday - mascotSuccessToday)
  const mascotSuccessRate = mascotChatsToday > 0 ? `${Math.round((mascotSuccessToday / mascotChatsToday) * 100)}%` : '—'

  return {
    articleCount,
    draftCount,
    mascotChatsToday,
    mascotFailureToday,
    mascotSuccessRate,
    pageViewsToday,
    pendingComments,
    pendingGuestbook,
    pendingTotal,
    recentArticles: recentArticles.map(article => ({
      accessType: article.accessType,
      commentCount: article._count.comments,
      createdAt: article.createdAt,
      id: article.id,
      mood: article.mood,
      pinned: article.pinned,
      published: article.published,
      slug: article.slug,
      title: article.title,
    })),
    revenueCents,
    sunflowerTotalCount: sunflowerState?.totalCount ?? 0,
    todayPublished,
    yesterdayPublished,
  }
}
