import type { Metadata } from 'next'
import Link from 'next/link'

import ArticleCard from '@/components/blog/ArticleCard'
import BlogTheme from '@/components/blog/BlogTheme'
import Header from '@/components/blog/Header'
import PikachuWidget from '@/components/blog/PikachuWidget'
import SiteFooter from '@/components/blog/SiteFooter'
import StructuredData from '@/components/StructuredData'
import { getAllPosts } from '@/lib/posts'
import { absoluteUrl } from '@/lib/site'
import { buildCollectionPageSchema, buildSeoImageCandidates, getSiteSeoData } from '@/lib/seo'
import { getSetting } from '@/lib/settings'
import { formatDate } from '@/lib/utils'

export const revalidate = 3600

function parseKeywords(rawKeywords: string, fallback: string[]) {
  const keywords = rawKeywords
    .split(',')
    .map(keyword => keyword.trim())
    .filter(Boolean)

  return [...new Set([...keywords, ...fallback])].slice(0, 12)
}

export async function generateMetadata(): Promise<Metadata> {
  const [site, keywordsSetting] = await Promise.all([
    getSiteSeoData(),
    getSetting('site.keywords'),
  ])
  const title = `${site.siteName} | 记录生活小事、方言与人生感悟`
  const description = site.siteDescription || '一个记录日常、美食、方言文化和人生思考的个人博客，分享正在发生的小事与真实感悟。'
  const images = buildSeoImageCandidates(site.coverImage, site.authorImage, site.favicon)
  const keywords = keywordsSetting
    .split(',')
    .map(keyword => keyword.trim())
    .filter(Boolean)

  return {
    title: {
      absolute: title,
    },
    description,
    keywords: keywords.length > 0 ? keywords : undefined,
    alternates: {
      canonical: '/',
    },
    openGraph: {
      type: 'website',
      title,
      description,
      url: absoluteUrl('/'),
      siteName: site.siteName,
      locale: 'zh_CN',
      images: images.length > 0 ? images.map(url => ({ url })) : undefined,
    },
    twitter: {
      card: images.length > 0 ? 'summary_large_image' : 'summary',
      title,
      description,
      images: images.length > 0 ? images : undefined,
    },
  }
}

export default async function HomePage() {
  const [site, posts, aboutSubtitle, keywordsSetting] = await Promise.all([
    getSiteSeoData(),
    getAllPosts(),
    getSetting('blog.aboutSubtitle'),
    getSetting('site.keywords'),
  ])

  const latestPosts = posts.slice(0, 6)
  const latestUpdate = posts[0] ? formatDate(posts[0].updatedAt || posts[0].publishedAt) : '最近更新'
  const archiveYears = Array.from(
    posts.reduce((map, post) => {
      const year = new Date(post.updatedAt || post.publishedAt).getFullYear().toString()
      map.set(year, (map.get(year) || 0) + 1)
      return map
    }, new Map<string, number>()),
  ).slice(0, 4)
  const topicKeywords = parseKeywords(
    keywordsSetting,
    posts.flatMap(post => post.tags).filter(Boolean),
  )
  const listedPosts = latestPosts.map(post => ({
    title: post.title,
    url: absoluteUrl(post.href || `/article/${post.slug}`),
    description: post.description,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
  }))

  return (
    <BlogTheme>
      <StructuredData
        data={buildCollectionPageSchema(site, {
          path: '/',
          title: site.siteName,
          description: site.siteDescription,
          items: listedPosts,
        })}
      />

      <div className="min-h-screen">
        <Header />

        <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
          <section className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_320px]">
            <div className="theme-panel-soft p-6 sm:p-8">
              <p className="text-xs uppercase tracking-[0.28em] text-[var(--text-faint)]">Home</p>
              <h1 className="mt-3 font-serif text-3xl font-medium leading-tight text-[var(--text-primary)] sm:text-5xl">
                {site.siteName}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
                {site.siteDescription}
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-subtle)]">
                {aboutSubtitle || '这里主要记录生活、情绪、思考和正在经历的事情，也给愿意慢慢阅读的人留一个安静入口。'}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/blog" className="rounded-full bg-[var(--text-primary)] px-5 py-2.5 text-sm text-white transition-opacity hover:opacity-90">
                  进入文章
                </Link>
                <Link href="/archive" className="rounded-full border border-[var(--border-color)] px-5 py-2.5 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]">
                  时间归档
                </Link>
                <Link href="/about" className="rounded-full border border-[var(--border-color)] px-5 py-2.5 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]">
                  关于我
                </Link>
                <a href="/rss.xml" className="rounded-full border border-[var(--border-color)] px-5 py-2.5 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]">
                  RSS 订阅
                </a>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <span className="theme-chip !px-3 !py-1.5 !text-[11px] !shadow-none">公开文章 {posts.length} 篇</span>
                <span className="theme-chip !px-3 !py-1.5 !text-[11px] !shadow-none">最近更新 {latestUpdate}</span>
                <span className="theme-chip !px-3 !py-1.5 !text-[11px] !shadow-none">移动端友好</span>
              </div>
            </div>

            <div className="space-y-4">
              <section className="theme-panel-soft p-5">
                <p className="text-xs uppercase tracking-[0.26em] text-[var(--text-faint)]">Topics</p>
                <h2 className="mt-3 font-serif text-2xl font-medium text-[var(--text-primary)]">主题关键词</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {topicKeywords.map(keyword => (
                    <Link
                      key={keyword}
                      href={`/blog?q=${encodeURIComponent(keyword)}`}
                      className="rounded-full border border-[var(--border-soft)] bg-white/75 px-3 py-1.5 text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    >
                      #{keyword}
                    </Link>
                  ))}
                </div>
              </section>

              <section className="theme-panel-soft p-5">
                <p className="text-xs uppercase tracking-[0.26em] text-[var(--text-faint)]">Archive</p>
                <h2 className="mt-3 font-serif text-2xl font-medium text-[var(--text-primary)]">时间归档</h2>
                <div className="mt-4 space-y-2">
                  {archiveYears.map(([year, count]) => (
                    <Link
                      key={year}
                      href={`/archive#year-${year}`}
                      className="flex items-center justify-between rounded-2xl border border-[var(--border-soft)] bg-white/55 px-4 py-3 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    >
                      <span>{year}</span>
                      <span>{count} 篇</span>
                    </Link>
                  ))}
                </div>
              </section>
            </div>
          </section>

          <section className="mt-10">
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.26em] text-[var(--text-faint)]">Latest</p>
                <h2 className="mt-2 font-serif text-3xl font-medium text-[var(--text-primary)]">最近更新</h2>
                <p className="mt-2 text-sm text-[var(--text-subtle)]">首页只放最近几篇，完整列表和筛选都放在文章页里。</p>
              </div>
              <Link href="/blog" className="text-sm text-[var(--text-subtle)] transition-colors hover:text-[var(--accent)]">
                查看全部文章 →
              </Link>
            </div>

            <div className="space-y-4">
              {latestPosts.map(post => (
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
                />
              ))}
            </div>
          </section>
        </main>

        <SiteFooter />
        <PikachuWidget />
      </div>
    </BlogTheme>
  )
}
