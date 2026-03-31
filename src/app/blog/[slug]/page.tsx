import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import ArticleEngagementBar from '@/components/blog/ArticleEngagementBar'
import BlogTheme from '@/components/blog/BlogTheme'
import Header from '@/components/blog/Header'
import MarkdownContent from '@/components/blog/MarkdownContent'
import PikachuWidget from '@/components/blog/PikachuWidget'
import SiteFooter from '@/components/blog/SiteFooter'
import StructuredData from '@/components/StructuredData'
import { getRestrictedArticlePreview } from '@/lib/article-access'
import { getArticleEngagementSeedBySlug } from '@/lib/article-engagement'
import { getAllPostSlugs, getPostBySlug, syncMarkdownPostsToDatabase } from '@/lib/posts'
import { getLegacyArticleTitleBySlug } from '@/lib/services/legacy-article-service'
import { absoluteUrl } from '@/lib/site'
import { buildArticleSchema, buildBreadcrumbSchema, buildSeoImageCandidates, getSiteSeoData } from '@/lib/seo'
import { formatDate } from '@/lib/utils'

export const revalidate = 3600

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const slugs = await getAllPostSlugs()
  return slugs.map(slug => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  await syncMarkdownPostsToDatabase()

  const [legacyArticle, site] = await Promise.all([
    getLegacyArticleTitleBySlug(slug),
    getSiteSeoData(),
  ])
  if (legacyArticle) {
    const description = getRestrictedArticlePreview(legacyArticle.accessType, legacyArticle.price) || legacyArticle.excerpt || '文章详情'
    const images = buildSeoImageCandidates(legacyArticle.coverImage, site.coverImage, site.authorImage, site.favicon)

    return {
      title: legacyArticle.title,
      description,
      alternates: {
        canonical: `/article/${slug}`,
      },
      openGraph: {
        type: 'article',
        title: legacyArticle.title,
        description,
        url: absoluteUrl(`/article/${slug}`),
        siteName: site.siteName,
        locale: 'zh_CN',
        publishedTime: legacyArticle.createdAt.toISOString(),
        modifiedTime: legacyArticle.updatedAt.toISOString(),
        images: images.length > 0 ? images.map(url => ({ url })) : undefined,
      },
      twitter: {
        card: images.length > 0 ? 'summary_large_image' : 'summary',
        title: legacyArticle.title,
        description,
        images: images.length > 0 ? images : undefined,
      },
    }
  }

  const post = await getPostBySlug(slug)

  if (!post) {
    return {
      title: '文章未找到',
    }
  }

  const images = buildSeoImageCandidates(post.coverImage, site.coverImage, site.authorImage, site.favicon)
  const keywords = [post.title, ...post.tags].filter(Boolean)

  return {
    title: post.title,
    description: post.description,
    keywords,
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.description,
      url: absoluteUrl(`/blog/${post.slug}`),
      siteName: site.siteName,
      locale: 'zh_CN',
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt || post.publishedAt,
      images: images.length > 0 ? images.map(url => ({ url })) : undefined,
    },
    twitter: {
      card: images.length > 0 ? 'summary_large_image' : 'summary',
      title: post.title,
      description: post.description,
      images: images.length > 0 ? images : undefined,
    },
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  await syncMarkdownPostsToDatabase()

  const legacyArticle = await getLegacyArticleTitleBySlug(slug)
  if (legacyArticle) {
    redirect(`/article/${slug}`)
  }

  const post = await getPostBySlug(slug)

  if (!post) {
    notFound()
  }

  const [site, engagement] = await Promise.all([
    getSiteSeoData(),
    getArticleEngagementSeedBySlug(slug),
  ])
  const description = post.description
  const breadcrumbs = buildBreadcrumbSchema([
    { name: '博客', path: '/blog' },
    { name: post.title, path: `/blog/${slug}` },
  ])

  return (
    <BlogTheme>
      <StructuredData
        data={[
          buildArticleSchema(site, {
            path: `/blog/${slug}`,
            title: post.title,
            description,
            content: post.content,
            publishedAt: post.publishedAt,
            updatedAt: post.updatedAt,
            image: post.coverImage,
            tags: post.tags,
            readingTimeMinutes: post.readingTimeMinutes,
            isAccessibleForFree: true,
          }),
          breadcrumbs,
        ]}
      />
      <div className="min-h-screen">
        <Header />

        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
          <header className="mb-10">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-2xl">{post.mood}</span>
              <span className="badge badge-public">Markdown</span>
              <span className="text-xs text-[var(--text-subtle)]">{post.readingTimeMinutes} 分钟阅读</span>
            </div>
            <h1 className="mb-3 font-serif text-2xl font-medium leading-snug text-[var(--text-primary)] sm:text-4xl">
              {post.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-subtle)]">
              <time>{formatDate(post.publishedAt)}</time>
              {post.updatedAt && <span>更新于 {formatDate(post.updatedAt)}</span>}
            </div>
            {post.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {post.tags.map(tag => (
                  <span key={tag} className="rounded-full bg-[var(--surface-soft)] px-3 py-1 text-xs text-[var(--text-secondary)]">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </header>

          {post.coverImage && (
            <div className="mb-8 overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--surface-bg)]">
              <img
                src={post.coverImage}
                alt={post.title}
                className="block h-auto w-full"
                loading="eager"
              />
            </div>
          )}

          <MarkdownContent content={post.content} className="article-body" />

          {engagement ? (
            <ArticleEngagementBar
              articleId={engagement.articleId}
              slug={slug}
              title={post.title}
              sharePath={`/blog/${slug}`}
              commentsCount={engagement.summary.commentCount}
              initialSummary={engagement.summary}
            />
          ) : null}

          <div className="mt-12 border-t border-[var(--border-color)] pt-6">
            <a href="/blog" className="text-sm text-[var(--text-subtle)] transition-colors hover:text-[var(--accent)]">
              ← 返回博客列表
            </a>
          </div>
        </main>

        <SiteFooter compact />

        <PikachuWidget />
      </div>
    </BlogTheme>
  )
}
