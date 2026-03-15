import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Card, Badge } from '@/components/admin/ui'

export default async function AdminDashboard() {
  const [
    sunflowerState, articleCount, pendingComments,
    pendingGuestbook, totalRevenue, recentArticles,
    pageViewsToday,
  ] = await Promise.all([
    prisma.sunflowerState.findUnique({ where: { id: 'singleton' } }),
    prisma.article.count({ where: { published: true } }),
    prisma.comment.count({ where: { status: 'PENDING' } }),
    prisma.guestbook.count({ where: { status: 'PENDING' } }),
    prisma.payment.aggregate({ where: { status: 'COMPLETED' }, _sum: { amount: true } }),
    prisma.article.findMany({ orderBy: [{ pinned: 'desc' }, { pinnedAt: 'desc' }, { createdAt: 'desc' }], take: 6,
      select: { id: true, slug: true, title: true, mood: true, pinned: true, accessType: true, createdAt: true, published: true, _count: { select: { comments: true } } } }),
    prisma.pageView.count({ where: { enteredAt: { gte: new Date(new Date().setHours(0,0,0,0)) } } }).catch(() => 0),
  ])

  const revenue = totalRevenue?._sum?.amount ?? 0

  const stats = [
    { label: '已发布文章', value: articleCount,           href: '/admin/articles',  icon: '📄', color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-100' },
    { label: '待审评论',   value: pendingComments,        href: '/admin/comments',  icon: '💬', color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-100' },
    { label: '待审留言',   value: pendingGuestbook,       href: '/admin/guestbook', icon: '📮', color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-100' },
    { label: '累计打赏',   value: `¥${(revenue/100).toFixed(2)}`, href: '/admin/payments', icon: '💳', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    { label: '向日葵照顾', value: `${sunflowerState?.totalCount ?? 0}人`, href: '/admin/sunflower', icon: '🌻', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-100' },
    { label: '今日访问',   value: pageViewsToday,         href: '/admin/analytics', icon: '📊', color: 'text-slate-700',  bg: 'bg-slate-50',  border: 'border-slate-100' },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-800">仪表盘</h1>
        <p className="text-sm text-slate-500 mt-0.5">欢迎回来 👋</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {stats.map(s => (
          <Link key={s.label} href={s.href}
            className={`flex items-center gap-4 p-4 rounded-2xl border ${s.bg} ${s.border} hover:shadow-sm transition-all group`}>
            <span className="text-2xl">{s.icon}</span>
            <div>
              <p className="text-xs text-slate-500 mb-0.5">{s.label}</p>
              <p className={`text-2xl font-semibold ${s.color}`}>{s.value}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* 最近文章 */}
      <Card>
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-700">最近文章</h2>
          <Link href="/admin/articles/new"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 text-white text-xs font-medium hover:bg-slate-700 transition-colors">
            ＋ 写新文章
          </Link>
        </div>
        <div className="divide-y divide-slate-50">
          {recentArticles.length === 0 ? (
            <p className="py-8 text-center text-slate-400 text-sm">还没有文章</p>
          ) : recentArticles.map(a => (
            <Link key={a.id} href={`/admin/articles/${a.id}/edit`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
              <span className="text-base flex-shrink-0">{a.mood}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{a.pinned && <span className="mr-1 text-amber-500">📌</span>}{a.title}</p>
                <p className="text-xs text-slate-400">
                  {new Date(a.createdAt).toLocaleDateString('zh-CN')} · {a._count.comments} 条评论
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge status={a.accessType} />
                {!a.published && <Badge status="PENDING" label="草稿" />}
              </div>
            </Link>
          ))}
        </div>
        <div className="p-4 border-t border-slate-50">
          <Link href="/admin/articles" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
            查看全部文章 →
          </Link>
        </div>
      </Card>
    </div>
  )
}
