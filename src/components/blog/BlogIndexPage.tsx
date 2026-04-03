import Header from '@/components/blog/Header'
import ArticleCard from '@/components/blog/ArticleCard'
import PikachuWidget from '@/components/blog/PikachuWidget'
import SunflowerWidget from '@/components/blog/SunflowerWidget'
import SiteFooter from '@/components/blog/SiteFooter'
import AchievementPanel from '@/components/blog/AchievementPanel'
import type { BlogPostSummary } from '@/lib/posts'
import { fillTextTemplate } from '@/lib/text-template'

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

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-10 items-start">
          <div className="flex-1 min-w-0 w-full">
            <div className="mb-8 sm:mb-10">
              <h1 className="mb-2 font-serif text-2xl font-medium text-[var(--text-primary)] sm:text-3xl tracking-tight">{title}</h1>
              <p className="text-sm text-[var(--text-subtle)] leading-relaxed max-w-xl">{description}</p>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-[var(--text-subtle)]">{resultSummary}</p>
                <form action="/" method="get" className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="search"
                    name="q"
                    defaultValue={searchQuery}
                    placeholder={searchPlaceholder}
                    className="min-w-0 rounded-full border border-[var(--border-color)] bg-white/80 px-4 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-faint)] focus:border-[var(--accent)]"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      className="rounded-full border border-[var(--border-color)] bg-[var(--nav-pill-bg)] px-4 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    >
                      {searchButtonLabel}
                    </button>
                    {searchQuery ? (
                      <a
                        href="/"
                        className="rounded-full border border-[var(--border-color)] px-4 py-2 text-sm text-[var(--text-subtle)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                      >
                        {searchClearLabel}
                      </a>
                    ) : null}
                  </div>
                </form>
              </div>
            </div>

            {posts.length === 0 ? (
              <div className="py-24 text-center text-[var(--text-subtle)]">
                <p className="text-5xl mb-5">📝</p>
                <p className="text-base">{searchQuery ? emptySearchText : emptyStateText}</p>
              </div>
            ) : (
              <div className="space-y-5">
                {posts.map(post => (
                  <ArticleCard
                    key={post.slug}
                    href={post.href}
                    slug={post.slug}
                    title={post.title}
                    excerpt={post.excerpt}
                    mood={post.mood}
                    coverImage={post.coverImage}
                    pinned={post.pinned}
                    accessType={(post.accessType || "PUBLIC") as "PUBLIC" | "PASSWORD" | "PAID"}
                    price={post.price ?? null}
                    createdAt={post.publishedAt}
                  />
                ))}
              </div>
            )}
          </div>

          <aside className="w-full lg:w-64 lg:flex-shrink-0 lg:sticky lg:top-20 space-y-4">
            <SunflowerWidget />
            {showCornerCard ? (
              <div className="theme-panel-soft p-4">
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--text-faint)]">{cornerTitle}</p>
                <div className="space-y-2 text-sm text-[var(--text-secondary)]">
                  {cornerLines.map((line, index) => (
                    <p key={`${index}-${line}`}>{line}</p>
                  ))}
                </div>
              </div>
            ) : null}
            {showQuickLinksCard && hasQuickLinks ? (
              <div className="theme-panel-soft p-4">
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--text-faint)]">{quickLinksTitle}</p>
                <div className="space-y-1">
                  {showAboutQuickLink ? (
                    <a href={aboutHref} className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--nav-pill-hover)] hover:text-[var(--accent)]">
                      <span>👋</span> {aboutLabel}
                    </a>
                  ) : null}
                  {showGuestbookQuickLink ? (
                    <a href={guestbookHref} className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--nav-pill-hover)] hover:text-[var(--accent)]">
                      <span>💬</span> {guestbookLabel}
                    </a>
                  ) : null}
                  {showArchiveLink ? (
                    <a href="/archive" className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--nav-pill-hover)] hover:text-[var(--accent)]">
                      <span>🗂</span> {archiveLabel}
                    </a>
                  ) : null}
                  {showRssLink ? (
                    <a href="/rss.xml" className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--nav-pill-hover)] hover:text-[var(--accent)]">
                      <span>📡</span> {rssLabel}
                    </a>
                  ) : null}
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </main>

      <SiteFooter />

      <PikachuWidget />
      <AchievementPanel />
    </div>
  )
}
