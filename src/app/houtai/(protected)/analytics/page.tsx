import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export const metadata = { title: '访问统计' }
export const dynamic = 'force-dynamic'

function formatDuration(seconds: number | null) {
  if (!seconds) return '—'
  if (seconds < 60) return `${seconds} 秒`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m} 分 ${s} 秒` : `${m} 分钟`
}

function formatInteractionType(type: string) {
  switch (type) {
    case 'VIEW_ENTER':
      return '进入文章'
    case 'VIEW_QUALIFIED':
      return '有效阅读'
    case 'LIKE':
      return '点赞'
    case 'UNLIKE':
      return '取消点赞'
    case 'SHARE_LINK':
      return '复制链接'
    case 'SHARE_IMAGE':
      return '下载分享图'
    case 'COMMENT_SUBMIT':
      return '提交评论'
    default:
      return type
  }
}

function shortVisitorId(visitorId: string | null | undefined) {
  if (!visitorId) return '匿名'
  return visitorId.length > 10 ? `${visitorId.slice(0, 10)}…` : visitorId
}

type TopArticleRow = Prisma.ArticleAggregateGetPayload<{
  include: {
    article: {
      select: {
        title: true
        slug: true
        accessType: true
      }
    }
  }
}>

type RecentInteractionRow = Prisma.ArticleInteractionGetPayload<{
  include: {
    article: {
      select: {
        title: true
        slug: true
      }
    }
  }
}>

export default async function AdminAnalyticsPage() {
  let totalViews = 0
  let avgDurationResult: { _avg: { duration: number | null }; _count: { duration: number } } = {
    _avg: { duration: null },
    _count: { duration: 0 },
  }
  let distinctVisitors: Array<{ visitorId: string | null }> = []
  let articleTotals: { _sum: { qualifiedViewCount: number | null; likeCount: number | null; shareCount: number | null } } = {
    _sum: { qualifiedViewCount: 0, likeCount: 0, shareCount: 0 },
  }
  let totalComments = 0
  let topArticles: TopArticleRow[] = []
  let recentInteractions: RecentInteractionRow[] = []
  let geoStats: Array<{ ipRegion: string | null; ipCity: string | null; _count: { id: number } }> = []
  let referrerStats: Array<{ referrer: string | null; _count: { id: number } }> = []

  try {
    ;[
      totalViews,
      avgDurationResult,
      distinctVisitors,
      articleTotals,
      totalComments,
      topArticles,
      recentInteractions,
      geoStats,
      referrerStats,
    ] = await Promise.all([
      prisma.pageView.count(),
      prisma.pageView.aggregate({
        where: { duration: { not: null } },
        _avg: { duration: true },
        _count: { duration: true },
      }),
      prisma.pageView.findMany({
        where: { visitorId: { not: null } },
        distinct: ['visitorId'],
        select: { visitorId: true },
      }),
      prisma.articleAggregate.aggregate({
        _sum: {
          qualifiedViewCount: true,
          likeCount: true,
          shareCount: true,
        },
      }),
      prisma.comment.count(),
      prisma.articleAggregate.findMany({
        take: 12,
        orderBy: [{ qualifiedViewCount: 'desc' }, { viewCount: 'desc' }],
        include: {
          article: {
            select: {
              title: true,
              slug: true,
              accessType: true,
            },
          },
        },
      }),
      prisma.articleInteraction.findMany({
        take: 40,
        orderBy: { createdAt: 'desc' },
        include: {
          article: {
            select: {
              title: true,
              slug: true,
            },
          },
        },
      }),
      prisma.pageView.groupBy({
        by: ['ipRegion', 'ipCity'],
        where: { ipRegion: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      prisma.pageView.groupBy({
        by: ['referrer'],
        where: { referrer: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
    ])
  } catch {}

  const avgDuration = avgDurationResult._avg.duration
  const withDurationCount = avgDurationResult._count.duration
  const totalQualifiedViews = articleTotals._sum.qualifiedViewCount ?? 0
  const totalLikes = articleTotals._sum.likeCount ?? 0
  const totalShares = articleTotals._sum.shareCount ?? 0
  const uniqueVisitors = distinctVisitors.length

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-2xl font-medium text-[#221e1a]">互动与访问统计</h1>
        <p className="mt-1 text-sm text-[#a89880]">真实阅读、点赞、转发、评论与访客来源，统一在这里查看。</p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <div className="rounded-xl bg-[#eeedfe] p-4">
          <p className="mb-1 text-sm text-[#5a4f42]">总访问次数</p>
          <p className="text-3xl font-medium text-[#534ab7]">{totalViews.toLocaleString()}</p>
        </div>
        <div className="rounded-xl bg-[#e8f5ef] p-4">
          <p className="mb-1 text-sm text-[#5a4f42]">独立访客 UV</p>
          <p className="text-3xl font-medium text-[#1f7a4c]">{uniqueVisitors.toLocaleString()}</p>
        </div>
        <div className="rounded-xl bg-[#faf1dd] p-4">
          <p className="mb-1 text-sm text-[#5a4f42]">有效阅读</p>
          <p className="text-3xl font-medium text-[#9a5c0b]">{totalQualifiedViews.toLocaleString()}</p>
        </div>
        <div className="rounded-xl bg-[#fde8ef] p-4">
          <p className="mb-1 text-sm text-[#5a4f42]">当前点赞数</p>
          <p className="text-3xl font-medium text-[#b33b6b]">{totalLikes.toLocaleString()}</p>
        </div>
        <div className="rounded-xl bg-[#e6f0fb] p-4">
          <p className="mb-1 text-sm text-[#5a4f42]">累计转发</p>
          <p className="text-3xl font-medium text-[#2563eb]">{totalShares.toLocaleString()}</p>
        </div>
        <div className="rounded-xl bg-[#fff1e8] p-4">
          <p className="mb-1 text-sm text-[#5a4f42]">评论提交</p>
          <p className="text-3xl font-medium text-[#c2622d]">{totalComments.toLocaleString()}</p>
          <p className="mt-0.5 text-xs text-[#8c7d68]">平均停留 {formatDuration(Math.round(avgDuration ?? 0))}</p>
        </div>
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="card p-5">
          <h2 className="mb-4 font-medium text-[15px] text-[#221e1a]">文章表现榜</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#f0ebe3]">
                  <th className="px-3 py-2 text-left text-xs font-medium text-[#8c7d68]">文章</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[#8c7d68]">访问</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[#8c7d68]">有效阅读</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[#8c7d68]">点赞</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[#8c7d68]">转发</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[#8c7d68]">评论</th>
                </tr>
              </thead>
              <tbody>
                {topArticles.map(row => (
                  <tr key={row.articleId} className="border-b border-[#f0ebe3] hover:bg-[#faf8f5]">
                    <td className="px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-[#3d3530]">{row.article.title}</p>
                        <p className="mt-0.5 font-mono text-[11px] text-[#a89880]">/{row.article.slug}</p>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs text-[#5a4f42]">{row.viewCount}</td>
                    <td className="px-3 py-2 text-xs text-[#5a4f42]">{row.qualifiedViewCount}</td>
                    <td className="px-3 py-2 text-xs text-[#5a4f42]">{row.likeCount}</td>
                    <td className="px-3 py-2 text-xs text-[#5a4f42]">{row.shareCount}</td>
                    <td className="px-3 py-2 text-xs text-[#5a4f42]">{row.commentCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {topArticles.length === 0 ? <p className="py-6 text-center text-sm text-[#a89880]">暂无互动数据</p> : null}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="mb-4 font-medium text-[15px] text-[#221e1a]">平均停留与有效性</h2>
            <div className="space-y-3 text-sm text-[#5a4f42]">
              <div className="flex items-center justify-between">
                <span>平均停留时长</span>
                <span className="font-medium text-[#3b6d11]">{formatDuration(Math.round(avgDuration ?? 0))}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>有效停留样本</span>
                <span>{withDurationCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>有效阅读率</span>
                <span>{totalViews > 0 ? `${Math.round((totalQualifiedViews / totalViews) * 100)}%` : '0%'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>点赞率</span>
                <span>{totalQualifiedViews > 0 ? `${Math.round((totalLikes / totalQualifiedViews) * 100)}%` : '0%'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>转发率</span>
                <span>{totalQualifiedViews > 0 ? `${Math.round((totalShares / totalQualifiedViews) * 100)}%` : '0%'}</span>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="mb-4 font-medium text-[15px] text-[#221e1a]">来源 Top 10</h2>
            <div className="space-y-2">
              {referrerStats.map((row, index) => (
                <div key={`${row.referrer}-${index}`} className="flex items-center justify-between gap-3 rounded-lg bg-[#faf8f5] px-3 py-2">
                  <span className="truncate text-xs text-[#5a4f42]">{row.referrer || '直接访问'}</span>
                  <span className="flex-shrink-0 text-xs text-[#a89880]">{row._count.id} 次</span>
                </div>
              ))}
              {referrerStats.length === 0 ? <p className="py-4 text-center text-sm text-[#a89880]">暂无来源数据</p> : null}
            </div>
          </div>

          <div className="card p-5">
            <h2 className="mb-4 font-medium text-[15px] text-[#221e1a]">访客地区分布</h2>
            <div className="space-y-2">
              {geoStats.map((row, index) => {
                const label = [row.ipRegion, row.ipCity].filter(Boolean).join(' · ') || '未知'
                const pct = totalViews > 0 ? Math.round((row._count.id / totalViews) * 100) : 0
                return (
                  <div key={`${label}-${index}`} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#5a4f42]">{label}</span>
                      <span className="text-xs text-[#a89880]">{row._count.id} 次 · {pct}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[#f0ebe3]">
                      <div className="h-1.5 rounded-full bg-[#5aaa28]" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
              {geoStats.length === 0 ? <p className="py-4 text-center text-sm text-[#a89880]">暂无地区数据</p> : null}
            </div>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="mb-4 font-medium text-[15px] text-[#221e1a]">最近互动流水</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#f0ebe3]">
                <th className="px-3 py-2 text-left text-xs font-medium text-[#8c7d68]">时间</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-[#8c7d68]">互动</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-[#8c7d68]">文章</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-[#8c7d68]">访客</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-[#8c7d68]">来源/地区</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-[#8c7d68]">补充</th>
              </tr>
            </thead>
            <tbody>
              {recentInteractions.map(item => (
                <tr key={item.id} className="border-b border-[#f0ebe3] hover:bg-[#faf8f5]">
                  <td className="px-3 py-2 text-xs text-[#a89880]">{new Date(item.createdAt).toLocaleString('zh-CN')}</td>
                  <td className="px-3 py-2 text-xs text-[#5a4f42]">{formatInteractionType(item.type)}</td>
                  <td className="px-3 py-2">
                    <div>
                      <p className="text-xs text-[#3d3530]">{item.article.title}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-[#a89880]">/{item.article.slug}</p>
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-[#5a4f42]">{shortVisitorId(item.visitorId)}</td>
                  <td className="px-3 py-2 text-xs text-[#5a4f42]">
                    <div>{[item.ipRegion, item.ipCity].filter(Boolean).join(' · ') || '未知'}</div>
                    {item.referrer ? <div className="mt-0.5 truncate text-[#a89880]">{item.referrer}</div> : null}
                  </td>
                  <td className="px-3 py-2 text-xs text-[#5a4f42]">
                    {item.type === 'VIEW_QUALIFIED'
                      ? `${formatDuration(item.duration)} · 深度 ${item.scrollDepth ?? 0}%`
                      : item.channel || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {recentInteractions.length === 0 ? <p className="py-8 text-center text-sm text-[#a89880]">暂无互动流水</p> : null}
        </div>
      </div>
    </div>
  )
}
