import Link from 'next/link'
import { notFound } from 'next/navigation'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

import { formatDate } from '@/lib/utils'
import ArticleEngagementBar from '@/components/blog/ArticleEngagementBar'
import BlogArticleFrame from '@/components/blog/BlogArticleFrame'
import ArticlePager from '@/components/blog/ArticlePager'
import CommentSection from '@/components/blog/CommentSection'
import ArticleContent from '@/components/blog/ArticleContent'
import RelatedPosts from '@/components/blog/RelatedPosts'
import StructuredData from '@/components/StructuredData'
import { getPostBySlug, getPostNeighbors } from '@/lib/posts'
import { buildArticleSchema } from '@/lib/seo'
import { getArticleRouteMetadata, getLegacyArticlePageData } from '@/lib/services/article-page-service'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ token?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return getArticleRouteMetadata(slug)
}

export default async function ArticlePage({ params, searchParams }: Props) {
  const [{ slug }, resolvedSearchParams] = await Promise.all([params, searchParams])
  const pageData = await getLegacyArticlePageData(slug, resolvedSearchParams.token)

  if (!pageData) {
    const markdownPost = await getPostBySlug(slug)
    if (markdownPost) {
      redirect(`/blog/${slug}`)
    }
  }

  if (!pageData) notFound()

  const {
    site,
    article,
    tokenValid,
    comments,
    engagement,
    relatedPosts,
    copy,
    description,
    isAccessibleForFree,
    readingTimeMinutes,
    breadcrumbs,
  } = pageData
  const neighbors = await getPostNeighbors(slug)

  return (
    <>
      <StructuredData
        data={[
          buildArticleSchema(site, {
            path: `/article/${slug}`,
            title: article.title,
            description,
            content: isAccessibleForFree ? article.content : undefined,
            publishedAt: article.createdAt.toISOString(),
            updatedAt: article.updatedAt.toISOString(),
            image: article.coverImage || undefined,
            readingTimeMinutes,
            isAccessibleForFree,
          }),
          breadcrumbs,
        ]}
      />
      <BlogArticleFrame
        title={article.title}
        eyebrow="Article"
        mood={article.mood}
        breadcrumbs={(
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/" className="transition-colors hover:text-[var(--accent)]">首页</Link>
            <span>/</span>
            <Link href="/archive" className="transition-colors hover:text-[var(--accent)]">归档</Link>
            <span>/</span>
            <span className="text-[var(--text-secondary)]">{article.title}</span>
          </div>
        )}
        badges={(
          <>
            {article.accessType === 'PASSWORD' ? (
              <span className="badge badge-password">{copy.badges.password}</span>
            ) : null}
            {article.accessType === 'PAID' ? (
              <span className="badge badge-paid">{copy.badges.paid}</span>
            ) : null}
          </>
        )}
        summary={<p className="mt-1">{article.excerpt || description}</p>}
        meta={(
          <>
            <span className="theme-chip !px-3 !py-1.5 !shadow-none">
              <time>{formatDate(article.createdAt)}</time>
            </span>
            <span className="theme-chip !px-3 !py-1.5 !shadow-none">
              {readingTimeMinutes} {copy.markdown.readingTimeSuffix}
            </span>
            <span className="theme-chip !px-3 !py-1.5 !shadow-none">
              更新于 {formatDate(article.updatedAt)}
            </span>
          </>
        )}
        coverImage={article.coverImage}
        footer={<ArticlePager newer={neighbors.newer} older={neighbors.older} />}
      >
        <ArticleContent
          slug={slug}
          content={article.content}
          accessType={article.accessType as 'PUBLIC' | 'PASSWORD' | 'PAID'}
          price={article.price}
          title={article.title}
          tokenValid={tokenValid}
          passwordHint={article.passwordHint}
          paywallCopy={copy.paywall}
        />

        <ArticleEngagementBar
          articleId={article.id}
          slug={slug}
          title={article.title}
          sharePath={`/article/${slug}`}
          commentsCount={comments.length}
          initialSummary={engagement}
          showCommentLink
          copy={copy.engagement}
        />

        <CommentSection
          articleId={article.id}
          comments={comments}
          copy={copy.comments}
        />
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
