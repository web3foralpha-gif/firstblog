import Link from 'next/link'

import { ADMIN_SETTING_SECTION_MAP } from '@/components/houtai/admin-settings-config'
import { Badge, Card } from '@/components/houtai/ui'
import type { AdminDashboardData } from '@/lib/services/admin-dashboard-service'
import { formatDate } from '@/lib/utils'

type MetricCardProps = {
  accent: string
  href: string
  hint: string
  label: string
  value: string | number
}

type QuickActionProps = {
  description: string
  href: string
  icon: string
  label: string
}

type QueueItemProps = {
  count: number | string
  description: string
  href: string
  label: string
}

type ConfigLane = {
  description: string
  href: string
  items: Array<{
    description: string
    href: string
    label: string
  }>
  title: string
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

function getConfigLanes(): ConfigLane[] {
  return [
    {
      title: '站点与首页',
      description: '品牌、导航、首页呈现归到一组，改动路径更短。',
      href: '/houtai/settings?section=site',
      items: ['site', 'navigation', 'home'].map(sectionId => ({
        label: ADMIN_SETTING_SECTION_MAP[sectionId].title,
        description: ADMIN_SETTING_SECTION_MAP[sectionId].description,
        href: `/houtai/settings?section=${sectionId}`,
      })),
    },
    {
      title: '页面与内容呈现',
      description: '关于页、归档、留言板、文章页和海报统一放在内容展示层。',
      href: '/houtai/settings?section=about',
      items: ['about', 'archive', 'guestbook', 'article', 'poster'].map(sectionId => ({
        label: ADMIN_SETTING_SECTION_MAP[sectionId].title,
        description: ADMIN_SETTING_SECTION_MAP[sectionId].description,
        href: `/houtai/settings?section=${sectionId}`,
      })),
    },
    {
      title: '运营与服务',
      description: '互动、统计、支付、AI 和安全配置收进一个运营层。',
      href: '/houtai/settings?section=analytics',
      items: ['interaction', 'analytics', 'payments', 'ai', 'security'].map(sectionId => ({
        label: ADMIN_SETTING_SECTION_MAP[sectionId].title,
        description: ADMIN_SETTING_SECTION_MAP[sectionId].description,
        href: `/houtai/settings?section=${sectionId}`,
      })),
    },
  ]
}

function MetricCard({ accent, href, hint, label, value }: MetricCardProps) {
  return (
    <Link
      href={href}
      className="group rounded-[24px] border border-slate-200 bg-white px-5 py-5 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className={`h-2.5 w-2.5 rounded-full ${accent}`} />
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-400">{hint}</p>
    </Link>
  )
}

function QuickAction({ description, href, icon, label }: QuickActionProps) {
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

function QueueItem({ count, description, href, label }: QueueItemProps) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-white px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-800">{label}</p>
          <p className="mt-1 text-xs text-slate-400">{description}</p>
        </div>
        <span className="text-2xl font-semibold text-slate-900">{count}</span>
      </div>
      <Link href={href} className="mt-3 inline-flex text-xs font-medium text-slate-600 transition hover:text-slate-900">
        进入处理 →
      </Link>
    </div>
  )
}

export default function AdminDashboardView({ data }: { data: AdminDashboardData }) {
  const metricCards: MetricCardProps[] = [
    {
      label: '已发布文章',
      value: data.articleCount,
      hint: `今天公开 ${data.todayPublished} 篇，昨天公开 ${data.yesterdayPublished} 篇。`,
      href: '/houtai/articles',
      accent: 'bg-slate-900',
    },
    {
      label: '待处理事项',
      value: data.pendingTotal,
      hint: `评论 ${data.pendingComments} 条，留言 ${data.pendingGuestbook} 条。`,
      href: '/houtai/comments',
      accent: 'bg-amber-500',
    },
    {
      label: '今日访问',
      value: data.pageViewsToday,
      hint: '进入统计页查看真实访客、设备和访问轨迹。',
      href: '/houtai/analytics',
      accent: 'bg-emerald-500',
    },
    {
      label: '累计打赏',
      value: formatCurrencyCents(data.revenueCents),
      hint: `数字分身今日对话 ${data.mascotChatsToday} 次。`,
      href: '/houtai/payments',
      accent: 'bg-sky-500',
    },
  ]

  const quickActions: QuickActionProps[] = [
    {
      label: '写新文章',
      description: '直接打开编辑器，减少在后台首页绕路。',
      href: '/houtai/articles/new',
      icon: '✏️',
    },
    {
      label: '文章管理',
      description: '统一处理权限、封面、摘要和发布日期。',
      href: '/houtai/articles',
      icon: '📄',
    },
    {
      label: '评论与留言',
      description: '把访客互动放在同一入口，集中审核和回复。',
      href: '/houtai/comments',
      icon: '💬',
    },
    {
      label: '媒体与统计',
      description: '上传资源、核对访问质量和设备来源。',
      href: '/houtai/analytics',
      icon: '📊',
    },
  ]

  const queueItems: QueueItemProps[] = [
    {
      label: '评论待审',
      description: '先处理公开互动，避免真正的访客反馈被积压。',
      count: data.pendingComments,
      href: '/houtai/comments',
    },
    {
      label: '留言待审',
      description: '如果今天想统一回复，这里最适合先点进去。',
      count: data.pendingGuestbook,
      href: '/houtai/guestbook',
    },
    {
      label: '草稿待整理',
      description: '没有封面、摘要或权限没校对的文章可以集中补完。',
      count: data.draftCount,
      href: '/houtai/articles',
    },
    {
      label: '分身异常',
      description: '失败次数偏多时，优先检查模型配置和 API Key。',
      count: data.mascotFailureToday,
      href: '/houtai/settings?section=ai',
    },
  ]

  const configLanes = getConfigLanes()

  return (
    <div className="space-y-6">
      <Card className="rounded-[28px] border-slate-200 px-5 py-6 shadow-sm sm:px-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Dashboard</p>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-500">
                首页只保留概览、待办、内容入口和配置收纳
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-semibold text-slate-900">后台控制中心</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
              这一版把重复信息拿掉了：先看核心指标，再进入内容工作台、待办队列和配置中心。
              想改前台，也尽量收纳成分组入口，不再在首页铺满零散卡片。
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
              打开内容库
            </Link>
            <Link
              href="/houtai/settings"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              配置中心
            </Link>
            <Link
              href="/"
              target="_blank"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              查看前台
            </Link>
          </div>
        </div>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map(card => (
          <MetricCard key={card.label} {...card} />
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_360px]">
        <div className="space-y-6">
          <Card className="overflow-hidden border-slate-200">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-semibold text-slate-800">内容工作台</h2>
              <p className="mt-1 text-xs text-slate-400">保留最常用的 4 个入口，首页不再堆满同类按钮。</p>
            </div>
            <div className="grid gap-3 p-5 md:grid-cols-2">
              {quickActions.map(action => (
                <QuickAction key={action.label} {...action} />
              ))}
            </div>
          </Card>

          <Card className="overflow-hidden border-slate-200">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-800">配置中心</h2>
                  <p className="mt-1 text-xs text-slate-400">按场景收纳前台可编辑能力，避免设置项平铺在首页。</p>
                </div>
                <Link href="/houtai/settings" className="text-xs font-medium text-slate-500 transition hover:text-slate-900">
                  打开完整设置 →
                </Link>
              </div>
            </div>
            <div className="grid gap-4 p-5 xl:grid-cols-3">
              {configLanes.map(lane => (
                <div key={lane.title} className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-medium text-slate-800">{lane.title}</h3>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{lane.description}</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    {lane.items.slice(0, 3).map(item => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="block rounded-2xl border border-slate-200 bg-white px-3 py-3 transition hover:border-slate-300"
                      >
                        <p className="text-sm font-medium text-slate-700">{item.label}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-400">{item.description}</p>
                      </Link>
                    ))}
                  </div>
                  <Link href={lane.href} className="mt-4 inline-flex text-xs font-medium text-slate-600 transition hover:text-slate-900">
                    进入这一组 →
                  </Link>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="overflow-hidden border-slate-200">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-semibold text-slate-800">待处理队列</h2>
              <p className="mt-1 text-xs text-slate-400">把真正需要你马上处理的事情集中在右侧。</p>
            </div>
            <div className="space-y-3 px-5 py-5">
              {queueItems.map(item => (
                <QueueItem key={item.label} {...item} />
              ))}
            </div>
          </Card>

          <Card className="overflow-hidden border-slate-200">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-semibold text-slate-800">站点运行</h2>
              <p className="mt-1 text-xs text-slate-400">把今天的发文、分身和互动状态压成一眼能扫完的摘要。</p>
            </div>
            <div className="space-y-3 px-5 py-5 text-sm text-slate-600">
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span>发文节奏</span>
                <span className="font-medium text-slate-900">今日 {data.todayPublished} / 昨日 {data.yesterdayPublished}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span>数字分身</span>
                <span className="font-medium text-slate-900">{data.mascotChatsToday} 次 · 成功率 {data.mascotSuccessRate}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span>向日葵互动</span>
                <span className="font-medium text-slate-900">累计 {data.sunflowerTotalCount} 次</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span>累计打赏</span>
                <span className="font-medium text-slate-900">{formatCurrencyCents(data.revenueCents)}</span>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="font-semibold text-slate-800">最近文章</h2>
                <p className="mt-1 text-xs text-slate-400">只保留最近几篇和快捷动作，不再抢占首页空间。</p>
              </div>
              <Link href="/houtai/articles" className="text-xs font-medium text-slate-500 transition hover:text-slate-900">
                全部文章 →
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {data.recentArticles.length === 0 ? (
                <p className="px-5 py-10 text-sm text-slate-400">还没有文章</p>
              ) : (
                data.recentArticles.map(article => (
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
                          {formatDate(article.createdAt)} · {article.commentCount} 条评论 · {formatCompactDate(article.createdAt)}
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
