import { notFound } from 'next/navigation'
import { redirect } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import BlogTheme from '@/components/blog/BlogTheme'
import ArticleEngagementBar from '@/components/blog/ArticleEngagementBar'
import Header from '@/components/blog/Header'
import PikachuWidget from '@/components/blog/PikachuWidget'
import CommentSection from '@/components/blog/CommentSection'
import ArticleContent from '@/components/blog/ArticleContent'
import SiteFooter from '@/components/blog/SiteFooter'
import StructuredData from '@/components/StructuredData'
import { getRestrictedArticlePreview } from '@/lib/article-access'
import { getPostBySlug } from '@/lib/posts'
import { getArticleEngagementSummary } from '@/lib/article-engagement'
import { getLegacyArticleBySlug, getLegacyArticleTitleBySlug, hasLegacyArticleTokenAccess } from '@/lib/services/legacy-article-service'
import { absoluteUrl } from '@/lib/site'
import { buildArticleSchema, buildBreadcrumbSchema, buildSeoImageCandidates, getSiteSeoData, summarizeText } from '@/lib/seo'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ token?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const [article, site] = await Promise.all([
    getLegacyArticleTitleBySlug(slug),
    getSiteSeoData(),
  ])

  if (article) {
    const description = getRestrictedArticlePreview(article.accessType, article.price) || article.excerpt || '历史文章内容'
    const images = buildSeoImageCandidates(article.coverImage, site.coverImage, site.authorImage, site.favicon)

    return {
      title: article.title,
      description,
      alternates: {
        canonical: `/article/${slug}`,
      },
      openGraph: {
        type: 'article',
        title: article.title,
        description,
        url: absoluteUrl(`/article/${slug}`),
        siteName: site.siteName,
        locale: 'zh_CN',
        publishedTime: article.createdAt.toISOString(),
        modifiedTime: article.updatedAt.toISOString(),
        images: images.length > 0 ? images.map(url => ({ url })) : undefined,
      },
      twitter: {
        card: images.length > 0 ? 'summary_large_image' : 'summary',
        title: article.title,
        description,
        images: images.length > 0 ? images : undefined,
      },
    }
  }

  const markdownPost = await getPostBySlug(slug)
  if (!markdownPost) {
    return { title: '文章', description: '历史文章内容' }
  }

  const images = buildSeoImageCandidates(markdownPost.coverImage, site.coverImage, site.authorImage, site.favicon)

  return {
    title: markdownPost.title,
    description: markdownPost.description,
    alternates: {
      canonical: `/blog/${slug}`,
    },
    openGraph: {
      type: 'article',
      title: markdownPost.title,
      description: markdownPost.description,
      url: absoluteUrl(`/blog/${slug}`),
      siteName: site.siteName,
      locale: 'zh_CN',
      publishedTime: markdownPost.publishedAt,
      modifiedTime: markdownPost.updatedAt || markdownPost.publishedAt,
      images: images.length > 0 ? images.map(url => ({ url })) : undefined,
    },
    twitter: {
      card: images.length > 0 ? 'summary_large_image' : 'summary',
      title: markdownPost.title,
      description: markdownPost.description,
      images: images.length > 0 ? images : undefined,
    },
  }
}

export default async function ArticlePage({ params, searchParams }: Props) {
  const [{ slug }, resolvedSearchParams] = await Promise.all([params, searchParams])
  const [site, article] = await Promise.all([
    getSiteSeoData(),
    getLegacyArticleBySlug(slug),
  ])
  if (!article) {
    const markdownPost = await getPostBySlug(slug)
    if (markdownPost) {
      redirect(`/blog/${slug}`)
    }
  }

  if (!article) notFound()

  let tokenValid = false
  if (article.accessType === 'PAID' && resolvedSearchParams.token) {
    tokenValid = await hasLegacyArticleTokenAccess(article.id, resolvedSearchParams.token)
  }

  const comments = article.comments.map(c => ({
    ...c,
    email: c.email ?? undefined,
    createdAt: c.createdAt.toISOString(),
  }))
  const engagement = await getArticleEngagementSummary(article.id)
  const description = summarizeText(
    getRestrictedArticlePreview(article.accessType, article.price) || article.excerpt || article.content,
    180,
  ) || '历史文章内容'
  const isAccessibleForFree = article.accessType === 'PUBLIC' || tokenValid
  const breadcrumbs = buildBreadcrumbSchema([
    { name: '博客', path: '/blog' },
    { name: article.title, path: `/article/${slug}` },
  ])

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
            readingTimeMinutes: Math.max(1, Math.ceil(article.content.replace(/\s+/g, '').length / 320)),
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
                <span className="badge badge-password">🔒 加密文章</span>
              )}
              {article.accessType === 'PAID' && (
                <span className="badge badge-paid">💰 打赏文章</span>
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
          />

          <ArticleEngagementBar
            articleId={article.id}
            slug={slug}
            title={article.title}
            sharePath={`/article/${slug}`}
            commentsCount={comments.length}
            initialSummary={engagement}
            showCommentLink
          />

          <CommentSection articleId={article.id} comments={comments} />
        </main>

        <SiteFooter compact />
        <PikachuWidget />
      </div>
    </BlogTheme>
  )
}
