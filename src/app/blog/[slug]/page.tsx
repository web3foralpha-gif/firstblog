import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import ArticleEngagementBar from '@/components/blog/ArticleEngagementBar'
import BlogArticleFrame from '@/components/blog/BlogArticleFrame'
import ArticlePager from '@/components/blog/ArticlePager'
import MarkdownContent from '@/components/blog/MarkdownContent'
import RelatedPosts from '@/components/blog/RelatedPosts'
import StructuredData from '@/components/StructuredData'
import { getAllPostSlugs, getPostNeighbors, syncMarkdownPostsToDatabase } from '@/lib/posts'
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
  const neighbors = await getPostNeighbors(slug)

  return (
    <>
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
      <BlogArticleFrame
        title={post.title}
        eyebrow="Markdown"
        mood={post.mood}
        breadcrumbs={(
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/" className="transition-colors hover:text-[var(--accent)]">首页</Link>
            <span>/</span>
            <Link href="/archive" className="transition-colors hover:text-[var(--accent)]">归档</Link>
            <span>/</span>
            <span className="text-[var(--text-secondary)]">{post.title}</span>
          </div>
        )}
        badges={(
          <>
            <span className="badge badge-public">Markdown</span>
          </>
        )}
        summary={<p className="mt-1">{description}</p>}
        meta={(
          <>
            <span className="theme-chip !px-3 !py-1.5 !shadow-none">
              <time>{formatDate(post.publishedAt)}</time>
            </span>
            <span className="theme-chip !px-3 !py-1.5 !shadow-none">
              {post.readingTimeMinutes} {copy.markdown.readingTimeSuffix}
            </span>
            {post.updatedAt ? (
              <span className="theme-chip !px-3 !py-1.5 !shadow-none">
                {copy.markdown.updatedAtPrefix} {formatDate(post.updatedAt)}
              </span>
            ) : null}
          </>
        )}
        afterHeader={post.tags.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
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
        ) : null}
        coverImage={post.coverImage}
        titleClassName="mb-3 font-serif text-2xl font-medium leading-snug text-[var(--text-primary)] sm:text-4xl"
        footer={<ArticlePager newer={neighbors.newer} older={neighbors.older} homeLabel={copy.markdown.backLabel} />}
      >
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
      </BlogArticleFrame>
    </>
  )
}
