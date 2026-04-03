import { notFound } from 'next/navigation'
import { redirect } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import BlogTheme from '@/components/blog/BlogTheme'
import ArticleEngagementBar from '@/components/blog/ArticleEngagementBar'
import Header from '@/components/blog/Header'
import PikachuWidget from '@/components/blog/PikachuWidget'
import CommentSection from '@/components/blog/CommentSection'
import ArticleContent from '@/components/blog/ArticleContent'
import RelatedPosts from '@/components/blog/RelatedPosts'
import SiteFooter from '@/components/blog/SiteFooter'
import StructuredData from '@/components/StructuredData'
import { getPostBySlug } from '@/lib/posts'
import { buildArticleSchema } from '@/lib/seo'
import { getArticleRouteMetadata, getLegacyArticlePageData } from '@/lib/services/article-page-service'
import type { Metadata } from 'next'

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

  return (
    <BlogTheme>
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
      <div className="min-h-screen">
        <Header />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
          <header className="mb-10">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-2xl">{article.mood}</span>
              {article.accessType === 'PASSWORD' && (
                <span className="badge badge-password">{copy.badges.password}</span>
              )}
              {article.accessType === 'PAID' && (
                <span className="badge badge-paid">{copy.badges.paid}</span>
              )}
            </div>
            <h1 className="mb-3 font-serif text-2xl font-medium leading-snug text-[var(--text-primary)] sm:text-3xl">
              {article.title}
            </h1>
            <time className="text-sm text-[var(--text-subtle)]">{formatDate(article.createdAt)}</time>
          </header>

          {article.coverImage && (
            <div className="mb-8 overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--surface-bg)]">
              <img
                src={article.coverImage}
                alt={article.title}
                className="block h-auto w-full"
                loading="eager"
              />
            </div>
          )}

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
        </main>

        <SiteFooter compact />
        <PikachuWidget />
      </div>
    </BlogTheme>
  )
}
