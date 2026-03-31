import Link from 'next/link'

import { ADMIN_SETTING_SECTION_MAP } from '@/components/houtai/admin-settings-config'
import { Badge, Card } from '@/components/houtai/ui'
import { prisma } from '@/lib/prisma'
import { formatDate, getDayRangeInTimeZone } from '@/lib/utils'

export const dynamic = 'force-dynamic'

type OverviewCardProps = {
  label: string
  value: string | number
  hint: string
  href: string
  accent: string
}

type ShortcutCardProps = {
  label: string
  description: string
  href: string
  icon: string
}

type SettingsGroup = {
  title: string
  description: string
  items: Array<{
    label: string
    description: string
    href: string
  }>
}

function OverviewCard({ label, value, hint, href, accent }: OverviewCardProps) {
  return (
    <Link
      href={href}
      className="group rounded-[24px] border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <span className={`h-2.5 w-2.5 rounded-full ${accent}`} />
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-400">{hint}</p>
    </Link>
  )
}

function ShortcutCard({ label, description, href, icon }: ShortcutCardProps) {
  return (
    <Link
      href={href}
      className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-slate-300 hover:bg-white"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-lg">{icon}</span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-800">{label}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
      </div>
    </Link>
  )
}

function formatCurrencyCents(value: number) {
  return `¥${(value / 100).toFixed(2)}`
}

function formatCompactDate(date: Date) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Shanghai',
  }).format(date)
}

export default async function AdminDashboard() {
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
    prisma.mascotChatLog.count({ where: { createdAt: { gte: todayRange.start, lt: todayRange.end }, success: true } }).catch(() => 0),
    prisma.article.count({ where: { published: true, createdAt: { gte: todayRange.start, lt: todayRange.end } } }),
    prisma.article.count({ where: { published: true, createdAt: { gte: yesterdayRange.start, lt: yesterdayRange.end } } }),
  ])

  const revenue = totalRevenue?._sum?.amount ?? 0
  const pendingTotal = pendingComments + pendingGuestbook
  const mascotFailureToday = Math.max(0, mascotChatsToday - mascotSuccessToday)
  const mascotSuccessRate = mascotChatsToday > 0 ? `${Math.round((mascotSuccessToday / mascotChatsToday) * 100)}%` : '—'

  const overviewCards: OverviewCardProps[] = [
    {
      label: '已发布文章',
      value: articleCount,
      hint: `今天新增 ${todayPublished} 篇，昨天新增 ${yesterdayPublished} 篇`,
      href: '/houtai/articles',
      accent: 'bg-slate-900',
    },
    {
      label: '待处理事项',
      value: pendingTotal,
      hint: `评论 ${pendingComments} 条，留言 ${pendingGuestbook} 条`,
      href: '/houtai/comments',
      accent: 'bg-amber-500',
    },
    {
      label: '今日访问',
      value: pageViewsToday,
      hint: '进入统计页查看真实访客、设备和访问轨迹',
      href: '/houtai/analytics',
      accent: 'bg-emerald-500',
    },
    {
      label: '累计打赏',
      value: formatCurrencyCents(revenue),
      hint: `${draftCount} 篇草稿待整理`,
      href: '/houtai/payments',
      accent: 'bg-sky-500',
    },
  ]

  const settingsGroups: SettingsGroup[] = [
    {
      title: '品牌与前台',
      description: '把搜索展示、首页文案、关于页和海报入口收在一起。',
      items: ['site', 'blog', 'about', 'poster'].map(sectionId => ({
        label: ADMIN_SETTING_SECTION_MAP[sectionId].title,
        description: ADMIN_SETTING_SECTION_MAP[sectionId].description,
        href: `/houtai/settings?section=${sectionId}`,
      })),
    },
    {
      title: '运营与互动',
      description: '评论、支付、互动文案和统计过滤都集中在这一列。',
      items: ['payments', 'interaction', 'analytics'].map(sectionId => ({
        label: ADMIN_SETTING_SECTION_MAP[sectionId].title,
        description: ADMIN_SETTING_SECTION_MAP[sectionId].description,
        href: `/houtai/settings?section=${sectionId}`,
      })),
    },
    {
      title: 'AI 与安全',
      description: '数字分身、管理员登录和数据备份不再散落在首页。',
      items: [
        {
          label: ADMIN_SETTING_SECTION_MAP.ai.title,
          description: ADMIN_SETTING_SECTION_MAP.ai.description,
          href: '/houtai/settings?section=ai',
        },
        {
          label: ADMIN_SETTING_SECTION_MAP.security.title,
          description: ADMIN_SETTING_SECTION_MAP.security.description,
          href: '/houtai/settings?section=security',
        },
        {
          label: '备份导出',
          description: '手动备份当前数据，导出留档或迁移使用。',
          href: '/houtai/backup',
        },
      ],
    },
  ]

  return (
    <div className="space-y-6">
      <Card className="rounded-[28px] border-slate-200 px-5 py-6 shadow-sm sm:px-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Dashboard</p>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-500">
                现在改成“概览 → 内容 → 配置中心”的收纳结构
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-semibold text-slate-900">后台工作台</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
              首页只保留今天最该看的信息：文章、待办、访问和收入。设置项不再全部铺开，统一收进配置中心，点进对应板块再单独编辑。
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[320px]">
            <Link
              href="/houtai/articles/new"
              className="rounded-2xl bg-slate-900 px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-slate-800"
            >
              ＋ 写新文章
            </Link>
            <Link
              href="/houtai/articles"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              打开内容管理
            </Link>
            <Link
              href="/houtai/analytics"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              查看访问统计
            </Link>
            <Link
              href="/blog"
              target="_blank"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              看前台博客
            </Link>
          </div>
        </div>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {overviewCards.map(card => (
          <OverviewCard key={card.label} {...card} />
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_360px]">
        <div className="space-y-6">
          <Card className="overflow-hidden border-slate-200">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-semibold text-slate-800">内容工作台</h2>
              <p className="mt-1 text-xs text-slate-400">把你高频会点的内容入口放在最前面，其他设置尽量后移。</p>
            </div>
            <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
              <ShortcutCard label="文章管理" description="统一查看文章、权限、封面和发布日期。" href="/houtai/articles" icon="📄" />
              <ShortcutCard label="写新文章" description="直接进入编辑器，减少在后台首页来回切换。" href="/houtai/articles/new" icon="✏️" />
              <ShortcutCard label="评论审核" description={`${pendingComments} 条待处理评论，优先处理互动反馈。`} href="/houtai/comments" icon="💬" />
              <ShortcutCard label="留言审核" description={`${pendingGuestbook} 条待处理留言，适合集中清理。`} href="/houtai/guestbook" icon="📮" />
              <ShortcutCard label="媒体库" description="图片、视频和上传资源统一归档管理。" href="/houtai/media" icon="🗂️" />
              <ShortcutCard label="访问统计" description="查看真实访客、设备类型、浏览器和访问轨迹。" href="/houtai/analytics" icon="📊" />
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="overflow-hidden border-slate-200">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="font-semibold text-slate-800">今日动态</h2>
                <p className="mt-1 text-xs text-slate-400">把需要盯的运营节奏压缩成一眼可见的摘要。</p>
              </div>
              <div className="space-y-3 px-5 py-5">
                <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs text-slate-400">发文节奏</p>
                  <p className="mt-1 text-sm text-slate-700">今天公开 {todayPublished} 篇，昨天公开 {yesterdayPublished} 篇。</p>
                </div>
                <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs text-slate-400">AI 分身</p>
                  <p className="mt-1 text-sm text-slate-700">
                    今日对话 {mascotChatsToday} 次，成功率 {mascotSuccessRate}。
                  </p>
                </div>
                <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs text-slate-400">向日葵互动</p>
                  <p className="mt-1 text-sm text-slate-700">累计被照顾 {sunflowerState?.totalCount ?? 0} 次。</p>
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden border-slate-200">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="font-semibold text-slate-800">配置中心</h2>
                <p className="mt-1 text-xs text-slate-400">设置不再塞满首页，只保留分组入口。</p>
              </div>
              <div className="space-y-3 px-5 py-5">
                {settingsGroups.map(group => (
                  <div key={group.title} className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{group.title}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-400">{group.description}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {group.items.map(item => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
                <Link
                  href="/houtai/settings"
                  className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
                >
                  进入完整设置中心 →
                </Link>
              </div>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="overflow-hidden border-slate-200">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-semibold text-slate-800">今日待办</h2>
              <p className="mt-1 text-xs text-slate-400">把真正需要你处理的事情放在右侧，避免被无关卡片打断。</p>
            </div>
            <div className="space-y-3 px-5 py-5">
              <div className="rounded-[20px] border border-slate-200 bg-white px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">评论待审</p>
                    <p className="mt-1 text-xs text-slate-400">先处理访客互动，再看统计和配置。</p>
                  </div>
                  <span className="text-2xl font-semibold text-slate-900">{pendingComments}</span>
                </div>
                <Link href="/houtai/comments" className="mt-3 inline-flex text-xs font-medium text-slate-600 hover:text-slate-900">
                  去处理 →
                </Link>
              </div>

              <div className="rounded-[20px] border border-slate-200 bg-white px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">留言待审</p>
                    <p className="mt-1 text-xs text-slate-400">如果今天想统一回复，这里最适合先点进去。</p>
                  </div>
                  <span className="text-2xl font-semibold text-slate-900">{pendingGuestbook}</span>
                </div>
                <Link href="/houtai/guestbook" className="mt-3 inline-flex text-xs font-medium text-slate-600 hover:text-slate-900">
                  去处理 →
                </Link>
              </div>

              <div className="rounded-[20px] border border-slate-200 bg-white px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">草稿待整理</p>
                    <p className="mt-1 text-xs text-slate-400">没有封面、摘要或权限没校对的文章可以集中补完。</p>
                  </div>
                  <span className="text-2xl font-semibold text-slate-900">{draftCount}</span>
                </div>
                <Link href="/houtai/articles" className="mt-3 inline-flex text-xs font-medium text-slate-600 hover:text-slate-900">
                  去整理 →
                </Link>
              </div>

              <div className="rounded-[20px] border border-slate-200 bg-white px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">分身异常回复</p>
                    <p className="mt-1 text-xs text-slate-400">失败次数多时，优先检查模型配置和 API Key。</p>
                  </div>
                  <span className="text-2xl font-semibold text-slate-900">{mascotFailureToday}</span>
                </div>
                <Link href="/houtai/settings?section=ai" className="mt-3 inline-flex text-xs font-medium text-slate-600 hover:text-slate-900">
                  去检查 →
                </Link>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="font-semibold text-slate-800">最近文章</h2>
                <p className="mt-1 text-xs text-slate-400">只保留最近几篇和快捷动作，不再占太大面积。</p>
              </div>
              <Link href="/houtai/articles" className="text-xs font-medium text-slate-400 hover:text-slate-600">
                全部文章 →
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {recentArticles.length === 0 ? (
                <p className="px-5 py-10 text-sm text-slate-400">还没有文章</p>
              ) : (
                recentArticles.map(article => (
                  <div key={article.id} className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 text-lg">{article.mood || '📝'}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-medium text-slate-800">
                            {article.pinned ? <span className="mr-1 text-amber-500">📌</span> : null}
                            {article.title}
                          </p>
                          <Badge status={article.accessType} />
                          {!article.published ? <Badge status="PENDING" label="草稿" /> : null}
                        </div>
                        <p className="mt-1 text-xs text-slate-400">
                          {formatDate(article.createdAt)} · {article._count.comments} 条评论 · {formatCompactDate(article.createdAt)}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-3 text-xs font-medium text-slate-500">
                          <Link href={`/houtai/articles/${article.id}/edit`} className="hover:text-slate-900">
                            编辑
                          </Link>
                          {article.published ? (
                            <Link href={`/article/${article.slug}`} target="_blank" className="hover:text-slate-900">
                              前台查看
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
