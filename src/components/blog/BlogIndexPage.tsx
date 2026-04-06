import Link from 'next/link'

import ArticleCard from '@/components/blog/ArticleCard'
import BlogPageFrame from '@/components/blog/BlogPageFrame'
import SunflowerWidget from '@/components/blog/SunflowerWidget'
import type { BlogPostSummary } from '@/lib/posts'
import { fillTextTemplate } from '@/lib/text-template'
import { formatDate } from '@/lib/utils'

type BlogIndexPageProps = {
  posts: BlogPostSummary[]
  title?: string
  description?: string
  searchQuery?: string
  searchPlaceholder?: string
  searchButtonLabel?: string
  searchClearLabel?: string
  resultsSummaryTemplate?: string
  filteredResultsSummaryTemplate?: string
  emptyStateText?: string
  emptySearchText?: string
  cornerTitle?: string
  cornerLines?: string[]
  showCornerCard?: boolean
  quickLinksTitle?: string
  showQuickLinksCard?: boolean
  aboutLabel?: string
  aboutHref?: string
  guestbookLabel?: string
  guestbookHref?: string
  archiveLabel?: string
  showArchiveLink?: boolean
  rssLabel?: string
  showRssLink?: boolean
}

export default function BlogIndexPage({
  posts,
  title = '近期文章',
  description = '写下生活里的小事，也留下此刻的心情。',
  searchQuery = '',
  searchPlaceholder = '搜标题、摘要、关键词…',
  searchButtonLabel = '搜索',
  searchClearLabel = '清除',
  resultsSummaryTemplate = '共 {count} 篇',
  filteredResultsSummaryTemplate = '当前筛选：{query} · 共 {count} 篇',
  emptyStateText = '还没有公开文章，过几天再来看看吧。',
  emptySearchText = '暂时没有匹配这组关键词的文章。',
  cornerTitle = '小站角落',
  cornerLines = [
    '适合慢慢读几篇文章，发一会儿呆。',
    '右边的向日葵会记得每一次浇水、施肥和晒太阳。',
    '如果想留下点什么，留言板一直开着。',
  ],
  showCornerCard = true,
  quickLinksTitle = '快速入口',
  showQuickLinksCard = true,
  aboutLabel = '关于我',
  aboutHref = '/about',
  guestbookLabel = '留言板',
  guestbookHref = '/guestbook',
  archiveLabel = '归档',
  showArchiveLink = true,
  rssLabel = 'RSS',
  showRssLink = true,
}: BlogIndexPageProps) {
  const showAboutQuickLink = Boolean(aboutLabel.trim()) && Boolean(aboutHref.trim())
  const showGuestbookQuickLink = Boolean(guestbookLabel.trim()) && Boolean(guestbookHref.trim())
  const hasQuickLinks = showAboutQuickLink || showGuestbookQuickLink || showArchiveLink || showRssLink
  const resultSummary = searchQuery
    ? fillTextTemplate(filteredResultsSummaryTemplate, { query: searchQuery, count: posts.length })
    : fillTextTemplate(resultsSummaryTemplate, { count: posts.length })

  const pinnedPosts = posts.filter(post => Boolean(post.pinned))
  const restrictedCount = posts.filter(post => post.accessType === 'PASSWORD' || post.accessType === 'PAID').length
  const latestPost = posts[0] ?? null
  const featuredPost = searchQuery ? null : pinnedPosts[0] ?? latestPost
  const feedPosts = featuredPost && !searchQuery ? posts.filter(post => post.slug !== featuredPost.slug) : posts
  const heroStats = [
    { label: '公开文章', value: `${posts.length} 篇` },
    { label: '置顶内容', value: `${pinnedPosts.length} 篇` },
    { label: '需解锁', value: `${restrictedCount} 篇` },
    { label: '最近更新', value: latestPost ? formatDate(latestPost.updatedAt || latestPost.publishedAt) : '暂无' },
  ]

  return (
    <BlogPageFrame mainClassName="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <section className="theme-panel p-5 sm:p-7">
        <div className="relative z-[1]">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-faint)]">{searchQuery ? 'Search Result' : 'Front Page'}</p>
            <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <h1 className="font-serif text-3xl font-medium leading-tight text-[var(--text-primary)] sm:text-4xl">
                  {searchQuery ? `搜索：${searchQuery}` : title}
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
                  {description}
                </p>
              </div>

              {!searchQuery && showCornerCard ? (
                <div className="rounded-[24px] border border-[var(--border-soft)] bg-white/65 px-4 py-4 text-sm leading-7 text-[var(--text-muted)] shadow-[0_14px_32px_var(--card-shadow)] lg:max-w-[270px]">
                  <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--text-faint)]">{cornerTitle}</p>
                  <p className="mt-2">{cornerLines[0] || '适合慢慢读几篇文章，发一会儿呆。'}</p>
                  {cornerLines[1] ? <p className="mt-1 text-[var(--text-subtle)]">{cornerLines[1]}</p> : null}
                </div>
              ) : null}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {heroStats.map(stat => (
                <div key={stat.label} className="rounded-[22px] border border-[var(--border-soft)] bg-white/70 px-4 py-3 shadow-[0_12px_28px_var(--card-shadow)]">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-faint)]">{stat.label}</p>
                  <p className="mt-2 text-base font-medium text-[var(--text-primary)]">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <form action="/" method="get" className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="search"
                  name="q"
                  defaultValue={searchQuery}
                  placeholder={searchPlaceholder}
                  className="min-w-0 rounded-full border border-[var(--border-color)] bg-white/85 px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-faint)] focus:border-[var(--accent)] sm:min-w-[280px]"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="rounded-full border border-[var(--border-color)] bg-[var(--nav-pill-bg)] px-4 py-2.5 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  >
                    {searchButtonLabel}
                  </button>
                  {searchQuery ? (
                    <Link
                      href="/"
                      className="rounded-full border border-[var(--border-color)] px-4 py-2.5 text-sm text-[var(--text-subtle)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    >
                      {searchClearLabel}
                    </Link>
                  ) : null}
                </div>
              </form>

              <p className="text-sm text-[var(--text-subtle)]">{resultSummary}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-8">
        <div className="min-w-0 space-y-6">
          {featuredPost && !searchQuery ? (
            <section className="theme-panel-soft p-4 sm:p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-faint)]">Today&apos;s Note</p>
                  <h2 className="mt-2 font-serif text-2xl font-medium text-[var(--text-primary)]">今日入口</h2>
                </div>
                <p className="text-sm text-[var(--text-subtle)]">先读这一篇，首页就不会显得空，也更像一张真正的入口页。</p>
              </div>

              <Link href={featuredPost.href || `/article/${featuredPost.slug}`} className="group mt-5 block">
                <div className="rounded-[26px] border border-[var(--border-soft)] bg-white/72 p-5 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-[var(--accent)]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--border-soft)] bg-[var(--accent-soft)] text-lg shadow-inner shadow-white/70">
                      {featuredPost.mood}
                    </span>
                    {featuredPost.pinned ? <span className="badge badge-pinned">📌 置顶</span> : null}
                    {featuredPost.accessType === 'PASSWORD' ? <span className="badge badge-password">🔒 加密</span> : null}
                    {featuredPost.accessType === 'PAID' ? <span className="badge badge-paid">💰 打赏</span> : null}
                  </div>

                  <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
                    <div className="min-w-0">
                      <h3 className="font-serif text-[26px] font-medium leading-10 text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent)]">
                        {featuredPost.title}
                      </h3>
                      <p className="mt-3 line-clamp-4 text-sm leading-7 text-[var(--text-secondary)]">
                        {featuredPost.excerpt}
                      </p>
                    </div>

                    <div className="rounded-[22px] border border-[var(--border-soft)] bg-[var(--surface-muted-bg)] px-4 py-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-faint)]">阅读信息</p>
                      <div className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
                        <p>更新：{formatDate(featuredPost.updatedAt || featuredPost.publishedAt)}</p>
                        <p>阅读：{featuredPost.readingTimeMinutes} 分钟</p>
                        <p>状态：{featuredPost.accessType === 'PUBLIC' ? '公开可读' : featuredPost.accessType === 'PASSWORD' ? '密码解锁' : '打赏解锁'}</p>
                      </div>
                      <span className="mt-4 inline-flex items-center gap-1 rounded-full border border-[var(--border-soft)] bg-white/70 px-3 py-1.5 text-xs text-[var(--text-secondary)] transition-colors group-hover:border-[var(--accent)] group-hover:text-[var(--accent)]">
                        去读全文
                        <span aria-hidden="true">→</span>
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </section>
          ) : null}

          <section className="theme-panel-soft p-4 sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-faint)]">Reading List</p>
                <h2 className="mt-2 font-serif text-2xl font-medium text-[var(--text-primary)]">
                  {searchQuery ? '匹配到的文章' : '最近更新'}
                </h2>
              </div>
              <p className="text-sm text-[var(--text-subtle)]">
                {searchQuery ? '筛选结果已经按当前关键词整理好了。' : '先把内容按轻重分开，再慢慢往下读。'}
              </p>
            </div>

            {feedPosts.length === 0 ? (
              <div className="py-20 text-center text-[var(--text-subtle)]">
                <p className="mb-4 text-4xl">{featuredPost && !searchQuery ? '🌤️' : '📝'}</p>
                <p>{featuredPost && !searchQuery ? '上面那篇就是当前最值得先读的入口。' : searchQuery ? emptySearchText : emptyStateText}</p>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {feedPosts.map(post => (
                  <ArticleCard
                    key={post.slug}
                    href={post.href}
                    slug={post.slug}
                    title={post.title}
                    excerpt={post.excerpt}
                    mood={post.mood}
                    coverImage={post.coverImage}
                    pinned={post.pinned}
                    accessType={(post.accessType || 'PUBLIC') as 'PUBLIC' | 'PASSWORD' | 'PAID'}
                    price={post.price ?? null}
                    createdAt={post.publishedAt}
                    readingTimeMinutes={post.readingTimeMinutes}
                    tags={post.tags}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="w-full space-y-4 lg:sticky lg:top-20">
          <SunflowerWidget />

          {(showQuickLinksCard && hasQuickLinks) || showCornerCard ? (
            <div className="theme-panel-soft p-4 sm:p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-faint)]">{quickLinksTitle}</p>
              {showQuickLinksCard && hasQuickLinks ? (
                <div className="mt-3 space-y-1">
                  {showAboutQuickLink ? (
                    <Link href={aboutHref} className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--nav-pill-hover)] hover:text-[var(--accent)]">
                      <span>👋</span>
                      <span>{aboutLabel}</span>
                    </Link>
                  ) : null}
                  {showGuestbookQuickLink ? (
                    <Link href={guestbookHref} className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--nav-pill-hover)] hover:text-[var(--accent)]">
                      <span>💬</span>
                      <span>{guestbookLabel}</span>
                    </Link>
                  ) : null}
                  {showArchiveLink ? (
                    <Link href="/archive" className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--nav-pill-hover)] hover:text-[var(--accent)]">
                      <span>🗂</span>
                      <span>{archiveLabel}</span>
                    </Link>
                  ) : null}
                  {showRssLink ? (
                    <a href="/rss.xml" className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--nav-pill-hover)] hover:text-[var(--accent)]">
                      <span>📡</span>
                      <span>{rssLabel}</span>
                    </a>
                  ) : null}
                </div>
              ) : null}

              {showCornerCard ? (
                <div className={`${showQuickLinksCard && hasQuickLinks ? 'mt-4 border-t border-[var(--border-soft)] pt-4' : 'mt-3'} space-y-2 text-sm leading-6 text-[var(--text-secondary)]`}>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-faint)]">{cornerTitle}</p>
                  {cornerLines.map((line, index) => (
                    <p key={`${index}-${line}`}>{line}</p>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </aside>
      </div>
    </BlogPageFrame>
  )
}
