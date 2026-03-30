import Link from 'next/link'

import AdminSettingsCenter from '@/components/houtai/AdminSettingsCenter'
import { Badge, Card } from '@/components/houtai/ui'
import { prisma } from '@/lib/prisma'
import { getDayRangeInTimeZone } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const todayRange = getDayRangeInTimeZone()
  const [sunflowerState, articleCount, pendingComments, pendingGuestbook, totalRevenue, recentArticles, pageViewsToday] =
    await Promise.all([
      prisma.sunflowerState.findUnique({ where: { id: 'singleton' } }),
      prisma.article.count({ where: { published: true } }),
      prisma.comment.count({ where: { status: 'PENDING' } }),
      prisma.guestbook.count({ where: { status: 'PENDING' } }),
      prisma.payment.aggregate({ where: { status: 'COMPLETED' }, _sum: { amount: true } }),
      prisma.article.findMany({
        orderBy: [{ pinned: 'desc' }, { pinnedAt: 'desc' }, { createdAt: 'desc' }],
        take: 5,
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
    ])

  const revenue = totalRevenue?._sum?.amount ?? 0

  const stats = [
    {
      label: '已发布文章',
      value: articleCount,
      href: '/houtai/articles',
      icon: '📄',
      color: 'text-blue-700',
      bg: 'bg-blue-50',
      border: 'border-blue-100',
    },
    {
      label: '待审评论',
      value: pendingComments,
      href: '/houtai/comments',
      icon: '💬',
      color: 'text-amber-700',
      bg: 'bg-amber-50',
      border: 'border-amber-100',
    },
    {
      label: '待审留言',
      value: pendingGuestbook,
      href: '/houtai/guestbook',
      icon: '📮',
      color: 'text-violet-700',
      bg: 'bg-violet-50',
      border: 'border-violet-100',
    },
    {
      label: '累计打赏',
      value: `¥${(revenue / 100).toFixed(2)}`,
      href: '/houtai/payments',
      icon: '💳',
      color: 'text-emerald-700',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
    },
    {
      label: '今日访问',
      value: pageViewsToday,
      href: '/houtai/analytics',
      icon: '📊',
      color: 'text-slate-700',
      bg: 'bg-slate-50',
      border: 'border-slate-100',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-slate-200 bg-white px-5 py-6 shadow-sm sm:px-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Control Center</p>
            <h1 className="mt-3 text-2xl font-semibold text-slate-900">后台控制中心</h1>
            <p className="mt-3 text-sm leading-7 text-slate-500">
              现在把首页、关于页、海报、互动与安全设置尽量整合到一个工作台里，后续再扩展时也不需要一块块零散新增。
            </p>
          </div>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            <Link href="/houtai/articles/new" className="rounded-2xl border border-slate-200 bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800">
              ＋ 写文章
            </Link>
            <Link href="/blog" target="_blank" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
              看前台博客
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {stats.map(stat => (
          <Link
            key={stat.label}
            href={stat.href}
            className={`flex items-center gap-4 rounded-[24px] border ${stat.bg} ${stat.border} p-4 transition hover:-translate-y-0.5 hover:shadow-sm`}
          >
            <span className="text-2xl">{stat.icon}</span>
            <div>
              <p className="text-xs text-slate-500">{stat.label}</p>
              <p className={`text-2xl font-semibold ${stat.color}`}>{stat.value}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="font-semibold text-slate-800">内容工作台</h2>
              <p className="mt-1 text-xs text-slate-400">把文章、评论和媒体管理入口放在一起。</p>
            </div>
          </div>
          <div className="grid gap-3 p-5 md:grid-cols-2">
            {[
              ['文章管理', '/houtai/articles', '管理发布、权限与封面'],
              ['评论审核', '/houtai/comments', `${pendingComments} 条待处理评论`],
              ['媒体库', '/houtai/media', '统一查看图片、视频与上传内容'],
              ['留言审核', '/houtai/guestbook', `${pendingGuestbook} 条待处理留言`],
            ].map(([label, href, description]) => (
              <Link
                key={href}
                href={href}
                className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-slate-300 hover:bg-white"
              >
                <p className="text-sm font-medium text-slate-800">{label}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
              </Link>
            ))}
          </div>
          <div className="border-t border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>🌻</span>
              <span>向日葵累计互动 {sunflowerState?.totalCount ?? 0} 次，可在</span>
              <Link href="/houtai/sunflower" className="font-medium text-slate-700 hover:text-slate-900">
                向日葵面板
              </Link>
              <span>继续查看。</span>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-800">最近文章</h2>
            <Link href="/houtai/articles" className="text-xs text-slate-400 hover:text-slate-600">
              全部文章 →
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {recentArticles.length === 0 ? (
              <p className="px-5 py-10 text-sm text-slate-400">还没有文章</p>
            ) : (
              recentArticles.map(article => (
                <Link
                  key={article.id}
                  href={`/houtai/articles/${article.id}/edit`}
                  className="flex items-center gap-3 px-5 py-4 transition hover:bg-slate-50"
                >
                  <span className="text-lg">{article.mood || '📝'}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {article.pinned ? <span className="mr-1 text-amber-500">📌</span> : null}
                      {article.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {new Date(article.createdAt).toLocaleDateString('zh-CN')} · {article._count.comments} 条评论
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge status={article.accessType} />
                    {!article.published ? <Badge status="PENDING" label="草稿" /> : null}
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>
      </div>

      <AdminSettingsCenter
        title="收纳后的设置工作台"
        subtitle="这里只保留紧凑的板块导航，点进对应分组后再单独编辑，避免后台首页越铺越长。"
        mode="compact"
      />
    </div>
  )
}
