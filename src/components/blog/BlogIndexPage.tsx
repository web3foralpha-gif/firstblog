import Header from '@/components/blog/Header'
import ArticleCard from '@/components/blog/ArticleCard'
import PikachuWidget from '@/components/blog/PikachuWidget'
import SunflowerWidget from '@/components/blog/SunflowerWidget'
import SiteFooter from '@/components/blog/SiteFooter'
import type { BlogPostSummary } from '@/lib/posts'

type BlogIndexPageProps = {
  posts: BlogPostSummary[]
  title?: string
  description?: string
  cornerTitle?: string
  cornerLines?: string[]
  quickLinksTitle?: string
  aboutLabel?: string
  aboutHref?: string
  guestbookLabel?: string
  guestbookHref?: string
}

export default function BlogIndexPage({
  posts,
  title = '近期文章',
  description = '写下生活里的小事，也留下此刻的心情。',
  cornerTitle = '小站角落',
  cornerLines = [
    '适合慢慢读几篇文章，发一会儿呆。',
    '右边的向日葵会记得每一次浇水、施肥和晒太阳。',
    '如果想留下点什么，留言板一直开着。',
  ],
  quickLinksTitle = '快速入口',
  aboutLabel = '关于我',
  aboutHref = '/about',
  guestbookLabel = '留言板',
  guestbookHref = '/guestbook',
}: BlogIndexPageProps) {
  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
          <div className="flex-1 min-w-0 w-full">
            <div className="mb-6 sm:mb-8">
              <h1 className="mb-1 font-serif text-2xl font-medium text-[var(--text-primary)] sm:text-3xl">{title}</h1>
              <p className="text-sm text-[var(--text-subtle)]">{description}</p>
              <p className="mt-1 text-sm text-[var(--text-subtle)]">共 {posts.length} 篇</p>
            </div>

            {posts.length === 0 ? (
              <div className="py-20 text-center text-[var(--text-subtle)]">
                <p className="text-4xl mb-4">📝</p>
                <p>还没有公开文章，过几天再来看看吧。</p>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map(post => (
                  <ArticleCard
                    key={post.slug}
                    href={post.href}
                    slug={post.slug}
                    title={post.title}
                    excerpt={post.excerpt}
                    mood={post.mood}
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
            <div className="theme-panel-soft p-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--text-faint)]">{cornerTitle}</p>
              <div className="space-y-2 text-sm text-[var(--text-secondary)]">
                {cornerLines.map((line, index) => (
                  <p key={`${index}-${line}`}>{line}</p>
                ))}
              </div>
            </div>
            <div className="theme-panel-soft p-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--text-faint)]">{quickLinksTitle}</p>
              <div className="space-y-1">
                <a href={aboutHref} className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--nav-pill-hover)] hover:text-[var(--accent)]">
                  <span>👋</span> {aboutLabel}
                </a>
                <a href={guestbookHref} className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--nav-pill-hover)] hover:text-[var(--accent)]">
                  <span>💬</span> {guestbookLabel}
                </a>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <SiteFooter />

      <PikachuWidget />
    </div>
  )
}
