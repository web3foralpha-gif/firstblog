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
  const spotlightPosts = featuredPost
    ? pinnedPosts.filter(post => post.slug !== featuredPost.slug).slice(0, 2)
    : []
  const spotlightSlugs = new Set(spotlightPosts.map(post => post.slug))
  const feedPosts = featuredPost && !searchQuery
    ? posts.filter(post => post.slug !== featuredPost.slug && !spotlightSlugs.has(post.slug))
    : posts
  const heroStats = [
    { label: '公开文章', value: `${posts.length} 篇` },
    { label: '置顶内容', value: `${pinnedPosts.length} 篇` },
    { label: '需解锁', value: `${restrictedCount} 篇` },
    { label: '最近更新', value: latestPost ? formatDate(latestPost.updatedAt || latestPost.publishedAt) : '暂无' },
  ]

  return (
    <BlogPageFrame mainClassName="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <section className="theme-panel p-5 sm:p-7">
        <div className={`relative grid gap-6 ${featuredPost && !searchQuery ? 'xl:grid-cols-[minmax(0,1.2fr)_320px]' : ''}`}>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-faint)]">{searchQuery ? 'Search Result' : 'Front Page'}</p>
            <h1 className="mt-3 font-serif text-3xl font-medium leading-tight text-[var(--text-primary)] sm:text-4xl">
              {searchQuery ? `搜索：${searchQuery}` : title}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
              {description}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {heroStats.map(stat => (
                <span key={stat.label} className="theme-chip">
                  <span className="text-[var(--text-faint)]">{stat.label}</span>
                  <span className="font-medium text-[var(--text-primary)]">{stat.value}</span>
                </span>
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

          {featuredPost && !searchQuery ? (
            <Link href={featuredPost.href || `/article/${featuredPost.slug}`} className="group block">
              <div className="theme-panel-soft flex h-full flex-col justify-between p-5 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-[var(--accent)]">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-[var(--text-faint)]">今日入口</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-[var(--border-soft)] bg-[var(--accent-soft)] text-base shadow-inner shadow-white/70">
                      {featuredPost.mood}
                    </span>
                    {featuredPost.pinned ? <span className="badge badge-pinned">📌 置顶</span> : null}
                    {featuredPost.accessType === 'PASSWORD' ? <span className="badge badge-password">🔒 加密</span> : null}
                    {featuredPost.accessType === 'PAID' ? <span className="badge badge-paid">💰 打赏</span> : null}
                  </div>
                  <h2 className="mt-4 font-serif text-2xl font-medium leading-9 text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent)]">
                    {featuredPost.title}
                  </h2>
                  <p className="mt-3 line-clamp-4 text-sm leading-7 text-[var(--text-secondary)]">
                    {featuredPost.excerpt}
                  </p>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <span className="theme-chip !shadow-none">{formatDate(featuredPost.updatedAt || featuredPost.publishedAt)}</span>
                  <span className="theme-chip !shadow-none">{featuredPost.readingTimeMinutes} 分钟阅读</span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-soft)] bg-white/60 px-3 py-1.5 text-xs text-[var(--text-secondary)] transition-colors group-hover:border-[var(--accent)] group-hover:text-[var(--accent)]">
                    去读全文
                    <span aria-hidden="true">→</span>
                  </span>
                </div>
              </div>
            </Link>
          ) : null}
        </div>
      </section>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-8">
        <div className="min-w-0 space-y-6">
          {!searchQuery && spotlightPosts.length > 0 ? (
            <section className="theme-panel-soft p-4 sm:p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-faint)]">Spotlight</p>
                  <h2 className="mt-2 font-serif text-2xl font-medium text-[var(--text-primary)]">继续看看这些</h2>
                </div>
                <p className="text-sm text-[var(--text-subtle)]">把值得优先读的内容放在前面，但不再堆得太满。</p>
              </div>

              <div className="mt-5 space-y-4">
                {spotlightPosts.map(post => (
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

          {showQuickLinksCard && hasQuickLinks ? (
            <div className="theme-panel-soft p-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--text-faint)]">{quickLinksTitle}</p>
              <div className="space-y-1">
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
            </div>
          ) : null}

          {showCornerCard ? (
            <div className="theme-panel-soft p-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--text-faint)]">{cornerTitle}</p>
              <div className="space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
                {cornerLines.map((line, index) => (
                  <p key={`${index}-${line}`}>{line}</p>
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </BlogPageFrame>
  )
}
