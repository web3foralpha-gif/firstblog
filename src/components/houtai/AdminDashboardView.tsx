import Link from 'next/link'

import { ADMIN_SETTING_SECTION_MAP } from '@/components/houtai/admin-settings-config'
import { Badge, Card } from '@/components/houtai/ui'
import type { AdminDashboardData } from '@/lib/services/admin-dashboard-service'
import { formatDate } from '@/lib/utils'

type OverviewCardProps = {
  accent: string
  hint: string
  href: string
  label: string
  value: string | number
}

type ShortcutCardProps = {
  description: string
  href: string
  icon: string
  label: string
}

type SettingsGroup = {
  description: string
  items: Array<{
    description: string
    href: string
    label: string
  }>
  title: string
}

function OverviewCard({ accent, hint, href, label, value }: OverviewCardProps) {
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

function ShortcutCard({ description, href, icon, label }: ShortcutCardProps) {
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

function getSettingsGroups(): SettingsGroup[] {
  return [
    {
      title: '品牌与首页',
      description: '站点身份、导航和首页编排分开收纳，改起来更像专业控制台。',
      items: ['site', 'navigation', 'home'].map(sectionId => ({
        label: ADMIN_SETTING_SECTION_MAP[sectionId].title,
        description: ADMIN_SETTING_SECTION_MAP[sectionId].description,
        href: `/houtai/settings?section=${sectionId}`,
      })),
    },
    {
      title: '页面与传播',
      description: '关于页、归档页、页脚和分享海报分别单独编辑，不再互相挤在一起。',
      items: ['archive', 'about', 'guestbook', 'footer', 'poster', 'article', 'system'].map(sectionId => ({
        label: ADMIN_SETTING_SECTION_MAP[sectionId].title,
        description: ADMIN_SETTING_SECTION_MAP[sectionId].description,
        href: `/houtai/settings?section=${sectionId}`,
      })),
    },
    {
      title: '运营与服务',
      description: '互动文案、统计治理、支付、AI 和安全配置统一归到运营层。',
      items: ['interaction', 'analytics', 'payments', 'ai', 'security'].map(sectionId => ({
        label: ADMIN_SETTING_SECTION_MAP[sectionId].title,
        description: ADMIN_SETTING_SECTION_MAP[sectionId].description,
        href: `/houtai/settings?section=${sectionId}`,
      })),
    },
  ]
}

export default function AdminDashboardView({ data }: { data: AdminDashboardData }) {
  const overviewCards: OverviewCardProps[] = [
    {
      label: '已发布文章',
      value: data.articleCount,
      hint: `今天新增 ${data.todayPublished} 篇，昨天新增 ${data.yesterdayPublished} 篇`,
      href: '/houtai/articles',
      accent: 'bg-slate-900',
    },
    {
      label: '待处理事项',
      value: data.pendingTotal,
      hint: `评论 ${data.pendingComments} 条，留言 ${data.pendingGuestbook} 条`,
      href: '/houtai/comments',
      accent: 'bg-amber-500',
    },
    {
      label: '今日访问',
      value: data.pageViewsToday,
      hint: '进入统计页查看真实访客、设备和访问轨迹',
      href: '/houtai/analytics',
      accent: 'bg-emerald-500',
    },
    {
      label: '累计打赏',
      value: formatCurrencyCents(data.revenueCents),
      hint: `${data.draftCount} 篇草稿待整理`,
      href: '/houtai/payments',
      accent: 'bg-sky-500',
    },
  ]

  const contentShortcuts: ShortcutCardProps[] = [
    {
      label: '文章管理',
      description: '统一查看文章、权限、封面和发布日期。',
      href: '/houtai/articles',
      icon: '📄',
    },
    {
      label: '写新文章',
      description: '直接进入编辑器，减少在后台首页来回切换。',
      href: '/houtai/articles/new',
      icon: '✏️',
    },
    {
      label: '评论审核',
      description: `${data.pendingComments} 条待处理评论，优先处理互动反馈。`,
      href: '/houtai/comments',
      icon: '💬',
    },
    {
      label: '留言审核',
      description: `${data.pendingGuestbook} 条待处理留言，适合集中清理。`,
      href: '/houtai/guestbook',
      icon: '📮',
    },
    {
      label: '媒体库',
      description: '图片、视频和上传资源统一归档管理。',
      href: '/houtai/media',
      icon: '🗂️',
    },
    {
      label: '访问统计',
      description: '查看真实访客、设备类型、浏览器和访问轨迹。',
      href: '/houtai/analytics',
      icon: '📊',
    },
  ]

  const settingsGroups = getSettingsGroups()

  return (
    <div className="space-y-6">
      <Card className="rounded-[28px] border-slate-200 px-5 py-6 shadow-sm sm:px-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Dashboard</p>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-500">
                现在改成“概览 → 内容 → 前台配置 / 服务配置”的收纳结构
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-semibold text-slate-900">后台工作台</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
              首页只保留今天最该看的信息：文章、待办、访问和收入。前台相关配置被拆成更清晰的场景分组，点进对应板块就能直接编辑导航、首页、归档、关于页和页脚。
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
              href="/"
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
              {contentShortcuts.map(shortcut => (
                <ShortcutCard key={shortcut.label} {...shortcut} />
              ))}
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
                  <p className="mt-1 text-sm text-slate-700">今天公开 {data.todayPublished} 篇，昨天公开 {data.yesterdayPublished} 篇。</p>
                </div>
                <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs text-slate-400">AI 分身</p>
                  <p className="mt-1 text-sm text-slate-700">
                    今日对话 {data.mascotChatsToday} 次，成功率 {data.mascotSuccessRate}。
                  </p>
                </div>
                <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs text-slate-400">向日葵互动</p>
                  <p className="mt-1 text-sm text-slate-700">累计被照顾 {data.sunflowerTotalCount} 次。</p>
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden border-slate-200">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="font-semibold text-slate-800">配置中心</h2>
                <p className="mt-1 text-xs text-slate-400">把前台可编辑能力拆成独立模块，入口更清楚，修改更少绕路。</p>
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
                  <span className="text-2xl font-semibold text-slate-900">{data.pendingComments}</span>
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
                  <span className="text-2xl font-semibold text-slate-900">{data.pendingGuestbook}</span>
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
                  <span className="text-2xl font-semibold text-slate-900">{data.draftCount}</span>
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
                  <span className="text-2xl font-semibold text-slate-900">{data.mascotFailureToday}</span>
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
