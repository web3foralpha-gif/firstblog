import type { Metadata } from 'next'
import Link from 'next/link'

import BlogPageFrame from '@/components/blog/BlogPageFrame'
import StructuredData from '@/components/StructuredData'
import { getAllPosts, type BlogPostSummary } from '@/lib/posts'
import { absoluteUrl } from '@/lib/site'
import { buildCollectionPageSchema, getSiteSeoData } from '@/lib/seo'
import { getArchivePageData } from '@/lib/services/site-service'
import { formatDate } from '@/lib/utils'

export const revalidate = 3600

export async function generateMetadata(): Promise<Metadata> {
  const [site, archivePageData] = await Promise.all([
    getSiteSeoData(),
    getArchivePageData(),
  ])
  const description = archivePageData.description || '按时间整理博客文章，方便从年份和更新节奏里查看站点内容。'
  const title = `${archivePageData.title} | ${site.siteName}`

  return {
    title: archivePageData.title,
    description,
    alternates: {
      canonical: '/archive',
    },
    openGraph: {
      type: 'website',
      title,
      description,
      url: absoluteUrl('/archive'),
      siteName: site.siteName,
      locale: 'zh_CN',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  }
}

function groupPostsByYear(posts: BlogPostSummary[]) {
  return posts.reduce((map, post) => {
    const year = new Date(post.updatedAt || post.publishedAt).getFullYear().toString()
    const current = map.get(year) || []
    current.push(post)
    map.set(year, current)
    return map
  }, new Map<string, BlogPostSummary[]>())
}

export default async function ArchivePage() {
  const [site, posts, archivePageData] = await Promise.all([
    getSiteSeoData(),
    getAllPosts(),
    getArchivePageData(),
  ])
  const groupedPosts = Array.from(groupPostsByYear(posts).entries())
  const latestUpdatedLabel = posts[0] ? formatDate(posts[0].updatedAt || posts[0].publishedAt) : '暂无'
  const listedPosts = posts.slice(0, 20).map(post => ({
    title: post.title,
    url: absoluteUrl(post.href || `/article/${post.slug}`),
    description: post.description,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
  }))

  return (
    <>
      <StructuredData
        data={buildCollectionPageSchema(site, {
          path: '/archive',
          title: archivePageData.title,
          description: archivePageData.description,
          items: listedPosts,
        })}
      />
      <BlogPageFrame mainClassName="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
          <section className="theme-panel-soft p-6 sm:p-8">
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--text-faint)]">{archivePageData.eyebrow}</p>
            <h1 className="mt-3 font-serif text-3xl font-medium text-[var(--text-primary)] sm:text-4xl">{archivePageData.title}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
              {archivePageData.description}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="theme-chip">
                <span className="text-[var(--text-faint)]">年份</span>
                <span className="font-medium text-[var(--text-primary)]">{groupedPosts.length} 组</span>
              </span>
              <span className="theme-chip">
                <span className="text-[var(--text-faint)]">文章</span>
                <span className="font-medium text-[var(--text-primary)]">{posts.length} 篇</span>
              </span>
              <span className="theme-chip">
                <span className="text-[var(--text-faint)]">最近更新</span>
                <span className="font-medium text-[var(--text-primary)]">{latestUpdatedLabel}</span>
              </span>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/" className="rounded-full border border-[var(--border-color)] px-5 py-2.5 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]">
                {archivePageData.backHomeLabel}
              </Link>
              {archivePageData.showRss ? (
                <a href="/rss.xml" className="rounded-full border border-[var(--border-color)] px-5 py-2.5 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]">
                  {archivePageData.rssButtonLabel}
                </a>
              ) : null}
            </div>
          </section>

          <div className="mt-8 space-y-8">
            {groupedPosts.map(([year, yearPosts]) => (
              <section key={year} id={`year-${year}`} className="theme-panel-soft p-5 sm:p-6">
                <div className="mb-5 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-faint)]">Year</p>
                    <h2 className="mt-2 font-serif text-2xl font-medium text-[var(--text-primary)]">{year}</h2>
                  </div>
                  <span className="text-sm text-[var(--text-subtle)]">{yearPosts.length} 篇</span>
                </div>

                <div className="space-y-3">
                  {yearPosts.map(post => (
                    <Link
                      key={`${year}-${post.slug}`}
                      href={post.href || `/article/${post.slug}`}
                      className="flex flex-col gap-3 rounded-[22px] border border-[var(--border-soft)] bg-white/70 px-4 py-4 transition-all hover:-translate-y-0.5 hover:border-[var(--accent)] sm:flex-row sm:items-start"
                    >
                      <div className="w-full flex-shrink-0 text-sm text-[var(--text-faint)] sm:w-28">
                        {formatDate(post.updatedAt || post.publishedAt)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-serif text-lg font-medium text-[var(--text-primary)]">{post.title}</h3>
                          {post.accessType === 'PASSWORD' ? <span className="badge badge-password">🔒 加密</span> : null}
                          {post.accessType === 'PAID' ? <span className="badge badge-paid">💰 打赏</span> : null}
                        </div>
                        {post.excerpt ? (
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--text-subtle)]">{post.excerpt}</p>
                        ) : null}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
      </BlogPageFrame>
    </>
  )
}
