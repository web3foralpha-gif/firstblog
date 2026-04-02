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
import { getRestrictedArticlePreview } from '@/lib/article-access'
import { getPostBySlug, getRelatedPosts } from '@/lib/posts'
import { getArticleEngagementSummary } from '@/lib/article-engagement'
import { getLegacyArticleBySlug, getLegacyArticleTitleBySlug, hasLegacyArticleTokenAccess } from '@/lib/services/legacy-article-service'
import { absoluteUrl } from '@/lib/site'
import { buildArticleSchema, buildBreadcrumbSchema, buildSeoImageCandidates, getSiteSeoData, summarizeText } from '@/lib/seo'
import { getPublicSettings } from '@/lib/settings'
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
      keywords: [article.title].filter(Boolean),
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
    keywords: [markdownPost.title, ...(markdownPost.tags || [])].filter(Boolean),
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
  const [site, article, publicSettings] = await Promise.all([
    getSiteSeoData(),
    getLegacyArticleBySlug(slug),
    getPublicSettings(),
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
  const [engagement, relatedPosts] = await Promise.all([
    getArticleEngagementSummary(article.id),
    getRelatedPosts(slug, [], 3),
  ])
  const getText = (key: string, fallback: string) => publicSettings[key]?.trim() || fallback
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
                <span className="badge badge-password">{getText('article.passwordBadgeLabel', '🔒 加密文章')}</span>
              )}
              {article.accessType === 'PAID' && (
                <span className="badge badge-paid">{getText('article.paidBadgeLabel', '💰 打赏文章')}</span>
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
            paywallCopy={{
              title: getText('pay.paywallTitle', '打赏解锁'),
              description: getText('pay.paywallDescription', '本文需要打赏 ¥{price} 解锁'),
              hint: getText('pay.paywallHint', '支付成功后将向你的邮箱发送永久访问链接'),
              emailPlaceholder: getText('pay.paywallEmailPlaceholder', '你的邮箱（用于接收链接）'),
              errorMessage: getText('pay.paywallErrorMessage', '跳转失败，请稍后重试'),
              submittingLabel: getText('pay.paywallSubmittingLabel', '跳转支付中…'),
              submitLabel: getText('pay.paywallSubmitLabel', '打赏 ¥{price} 解锁 →'),
              providerHint: getText('pay.paywallProviderHint', '由 Stripe 提供安全支付'),
            }}
          />

          <ArticleEngagementBar
            articleId={article.id}
            slug={slug}
            title={article.title}
            sharePath={`/article/${slug}`}
            commentsCount={comments.length}
            initialSummary={engagement}
            showCommentLink
            copy={{
              readStatLabel: getText('article.readStatLabel', '阅读'),
              likeStatLabel: getText('article.likeStatLabel', '点赞'),
              shareStatLabel: getText('article.shareStatLabel', '转发'),
              commentStatLabel: getText('article.commentStatLabel', '评论'),
              likeActionLabel: getText('article.likeActionLabel', '点赞'),
              likedActionLabel: getText('article.likedActionLabel', '已点赞'),
              processingLabel: getText('article.processingLabel', '处理中…'),
              copyLinkActionLabel: getText('article.copyLinkActionLabel', '复制链接'),
              copyingLinkLabel: getText('article.copyingLinkLabel', '复制中…'),
              posterActionLabel: getText('article.posterActionLabel', '生成海报'),
              posterGeneratingLabel: getText('article.posterGeneratingLabel', '生成中…'),
              commentActionLabel: getText('article.commentActionLabel', '去评论'),
              interactionHint: getText('article.interactionHint', '《{title}》的阅读、点赞、转发和评论都会进入后台互动统计。'),
              sharePreviewTitle: getText('article.sharePreviewTitle', '文章海报预览'),
              sharePreviewSubtitle: getText('article.sharePreviewSubtitle', '可先预览，再自行复制或保存'),
              copyPosterActionLabel: getText('article.copyPosterActionLabel', '复制海报'),
              copyPosterCopyingLabel: getText('article.copyPosterCopyingLabel', '复制中…'),
              closeLabel: getText('article.closeLabel', '关闭'),
              posterMobileHint: getText('article.posterMobileHint', '移动端可长按海报保存，桌面端可右键另存为。'),
              copyLinkSuccess: getText('article.copyLinkSuccess', '文章链接已复制，去转发吧。'),
              copyLinkError: getText('article.copyLinkError', '复制链接失败，请稍后重试。'),
              posterGenerateSuccess: getText('article.posterGenerateSuccess', '分享海报已生成，可预览后自行复制或保存。'),
              posterGenerateError: getText('article.posterGenerateError', '分享图生成失败'),
              copyPosterSuccess: getText('article.copyPosterSuccess', '海报已复制到剪贴板。'),
              copyPosterError: getText('article.copyPosterError', '复制海报失败，请稍后重试。'),
              copyPosterUnsupportedError: getText('article.copyPosterUnsupportedError', '当前浏览器不支持复制图片，请长按或右键保存。'),
              likeError: getText('article.likeError', '点赞失败'),
            }}
          />

          <CommentSection
            articleId={article.id}
            comments={comments}
            copy={{
              sectionTitle: getText('article.commentSectionTitle', '评论'),
              emptyText: getText('article.commentEmptyText', '还没有评论，来说第一句话吧 ✍️'),
              formTitle: getText('article.commentFormTitle', '留下你的足迹'),
              nicknameLabel: getText('article.commentNicknameLabel', '昵称 *'),
              nicknamePlaceholder: getText('article.commentNicknamePlaceholder', '你的名字'),
              emailLabel: getText('article.commentEmailLabel', '邮箱'),
              emailOptionalLabel: getText('article.commentEmailOptionalLabel', '（可选）'),
              emailPlaceholder: getText('article.commentEmailPlaceholder', 'your@email.com'),
              contentLabel: getText('article.commentContentLabel', '评论 *'),
              contentPlaceholder: getText('article.commentContentPlaceholder', '说点什么吧…'),
              submitLabel: getText('article.commentSubmitLabel', '发表评论'),
              submittingLabel: getText('article.commentSubmittingLabel', '提交中…'),
              requiredError: getText('article.commentRequiredError', '请填写昵称和评论内容'),
              successMessage: getText('article.commentSuccessMessage', '评论已提交，审核通过后即可显示 🎉'),
              errorMessage: getText('article.commentErrorMessage', '提交失败，请稍后重试'),
            }}
          />
          <RelatedPosts
            posts={relatedPosts}
            eyebrow={getText('article.relatedEyebrow', 'More')}
            title={getText('article.relatedTitle', '继续阅读')}
            archiveLabel={getText('article.relatedArchiveLabel', '时间归档 →')}
            passwordBadgeLabel={getText('article.relatedPasswordBadgeLabel', '🔒 加密')}
            paidBadgeLabel={getText('article.relatedPaidBadgeLabel', '💰 打赏')}
          />
        </main>

        <SiteFooter compact />
        <PikachuWidget />
      </div>
    </BlogTheme>
  )
}
