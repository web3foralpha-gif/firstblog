import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import ArticleEngagementBar from '@/components/blog/ArticleEngagementBar'
import BlogTheme from '@/components/blog/BlogTheme'
import Header from '@/components/blog/Header'
import MarkdownContent from '@/components/blog/MarkdownContent'
import PikachuWidget from '@/components/blog/PikachuWidget'
import RelatedPosts from '@/components/blog/RelatedPosts'
import SiteFooter from '@/components/blog/SiteFooter'
import StructuredData from '@/components/StructuredData'
import { getAllPostSlugs, syncMarkdownPostsToDatabase } from '@/lib/posts'
import { getLegacyArticleTitleBySlug } from '@/lib/services/legacy-article-service'
import { buildArticleSchema } from '@/lib/seo'
import { getBlogRouteMetadata, getMarkdownArticlePageData } from '@/lib/services/article-page-service'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'

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
  return getBlogRouteMetadata(slug)
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  await syncMarkdownPostsToDatabase()

  const legacyArticle = await getLegacyArticleTitleBySlug(slug)
  if (legacyArticle) {
    redirect(`/article/${slug}`)
  }

  const pageData = await getMarkdownArticlePageData(slug)

  if (!pageData) {
    notFound()
  }

  const { site, post, engagement, relatedPosts, copy, description, breadcrumbs } = pageData

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
              <span className="text-xs text-[var(--text-subtle)]">{post.readingTimeMinutes} {copy.markdown.readingTimeSuffix}</span>
            </div>
            <h1 className="mb-3 font-serif text-2xl font-medium leading-snug text-[var(--text-primary)] sm:text-4xl">
              {post.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-subtle)]">
              <time>{formatDate(post.publishedAt)}</time>
              {post.updatedAt && <span>{copy.markdown.updatedAtPrefix} {formatDate(post.updatedAt)}</span>}
            </div>
            {post.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {post.tags.map(tag => (
                  <Link
                    key={tag}
                    href={`/blog?q=${encodeURIComponent(tag)}`}
                    className="rounded-full bg-[var(--surface-soft)] px-3 py-1 text-xs text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
                  >
                    #{tag}
                  </Link>
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
              copy={copy.engagement}
            />
          ) : null}

          <RelatedPosts
            posts={relatedPosts}
            eyebrow={copy.related.eyebrow}
            title={copy.related.title}
            archiveLabel={copy.related.archiveLabel}
            passwordBadgeLabel={copy.related.passwordBadgeLabel}
            paidBadgeLabel={copy.related.paidBadgeLabel}
          />

          <div className="mt-12 border-t border-[var(--border-color)] pt-6">
            <a href="/" className="text-sm text-[var(--text-subtle)] transition-colors hover:text-[var(--accent)]">
              {copy.markdown.backLabel}
            </a>
          </div>
        </main>

        <SiteFooter compact />

        <PikachuWidget />
      </div>
    </BlogTheme>
  )
}
