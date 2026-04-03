import 'server-only'

import type { Metadata } from 'next'

import { getRestrictedArticlePreview } from '@/lib/article-access'
import {
  getArticleEngagementSeedBySlug,
  getArticleEngagementSummary,
  type ArticleEngagementSummary,
} from '@/lib/article-engagement'
import { getPostBySlug, getRelatedPosts, type BlogPost } from '@/lib/posts'
import { buildBreadcrumbSchema, buildSeoImageCandidates, getSiteSeoData, summarizeText } from '@/lib/seo'
import { getSettings } from '@/lib/settings'
import { absoluteUrl } from '@/lib/site'

import {
  getLegacyArticleBySlug,
  getLegacyArticleTitleBySlug,
  hasLegacyArticleTokenAccess,
  type LegacyArticle,
} from './legacy-article-service'

const ARTICLE_COPY_KEYS = [
  'article.passwordBadgeLabel',
  'article.paidBadgeLabel',
  'article.commentSectionTitle',
  'article.commentEmptyText',
  'article.commentFormTitle',
  'article.commentNicknameLabel',
  'article.commentNicknamePlaceholder',
  'article.commentEmailLabel',
  'article.commentEmailOptionalLabel',
  'article.commentEmailPlaceholder',
  'article.commentContentLabel',
  'article.commentContentPlaceholder',
  'article.commentSubmitLabel',
  'article.commentSubmittingLabel',
  'article.commentRequiredError',
  'article.commentSuccessMessage',
  'article.commentErrorMessage',
  'article.readStatLabel',
  'article.likeStatLabel',
  'article.shareStatLabel',
  'article.commentStatLabel',
  'article.likeActionLabel',
  'article.likedActionLabel',
  'article.processingLabel',
  'article.copyLinkActionLabel',
  'article.copyingLinkLabel',
  'article.posterActionLabel',
  'article.posterGeneratingLabel',
  'article.commentActionLabel',
  'article.interactionHint',
  'article.sharePreviewTitle',
  'article.sharePreviewSubtitle',
  'article.copyPosterActionLabel',
  'article.copyPosterCopyingLabel',
  'article.closeLabel',
  'article.posterMobileHint',
  'article.copyLinkSuccess',
  'article.copyLinkError',
  'article.posterGenerateSuccess',
  'article.posterGenerateError',
  'article.copyPosterSuccess',
  'article.copyPosterError',
  'article.copyPosterUnsupportedError',
  'article.likeError',
  'article.relatedEyebrow',
  'article.relatedTitle',
  'article.relatedArchiveLabel',
  'article.relatedPasswordBadgeLabel',
  'article.relatedPaidBadgeLabel',
  'article.markdownBackLabel',
  'article.updatedAtPrefix',
  'article.readingTimeSuffix',
  'pay.paywallTitle',
  'pay.paywallDescription',
  'pay.paywallHint',
  'pay.paywallEmailPlaceholder',
  'pay.paywallErrorMessage',
  'pay.paywallSubmittingLabel',
  'pay.paywallSubmitLabel',
  'pay.paywallProviderHint',
] as const

type ArticleComment = {
  id: string
  nickname: string
  email?: string
  content: string
  createdAt: string
}

type ArticlePageCopy = {
  badges: {
    password: string
    paid: string
  }
  paywall: {
    title: string
    description: string
    hint: string
    emailPlaceholder: string
    errorMessage: string
    submittingLabel: string
    submitLabel: string
    providerHint: string
  }
  engagement: {
    readStatLabel: string
    likeStatLabel: string
    shareStatLabel: string
    commentStatLabel: string
    likeActionLabel: string
    likedActionLabel: string
    processingLabel: string
    copyLinkActionLabel: string
    copyingLinkLabel: string
    posterActionLabel: string
    posterGeneratingLabel: string
    commentActionLabel: string
    interactionHint: string
    sharePreviewTitle: string
    sharePreviewSubtitle: string
    copyPosterActionLabel: string
    copyPosterCopyingLabel: string
    closeLabel: string
    posterMobileHint: string
    copyLinkSuccess: string
    copyLinkError: string
    posterGenerateSuccess: string
    posterGenerateError: string
    copyPosterSuccess: string
    copyPosterError: string
    copyPosterUnsupportedError: string
    likeError: string
  }
  comments: {
    sectionTitle: string
    emptyText: string
    formTitle: string
    nicknameLabel: string
    nicknamePlaceholder: string
    emailLabel: string
    emailOptionalLabel: string
    emailPlaceholder: string
    contentLabel: string
    contentPlaceholder: string
    submitLabel: string
    submittingLabel: string
    requiredError: string
    successMessage: string
    errorMessage: string
  }
  related: {
    eyebrow: string
    title: string
    archiveLabel: string
    passwordBadgeLabel: string
    paidBadgeLabel: string
  }
  markdown: {
    backLabel: string
    updatedAtPrefix: string
    readingTimeSuffix: string
  }
}

type SiteSeoData = Awaited<ReturnType<typeof getSiteSeoData>>
type LegacyArticleMetadataRecord = NonNullable<Awaited<ReturnType<typeof getLegacyArticleTitleBySlug>>>

function buildTextResolver(settings: Awaited<ReturnType<typeof getSettings<typeof ARTICLE_COPY_KEYS>>>) {
  return (key: (typeof ARTICLE_COPY_KEYS)[number], fallback: string) => settings[key].trim() || fallback
}

export async function getArticlePageCopy(): Promise<ArticlePageCopy> {
  const settings = await getSettings(ARTICLE_COPY_KEYS)
  const text = buildTextResolver(settings)

  return {
    badges: {
      password: text('article.passwordBadgeLabel', '🔒 加密文章'),
      paid: text('article.paidBadgeLabel', '💰 打赏文章'),
    },
    paywall: {
      title: text('pay.paywallTitle', '打赏解锁'),
      description: text('pay.paywallDescription', '本文需要打赏 ¥{price} 解锁'),
      hint: text('pay.paywallHint', '支付成功后将向你的邮箱发送永久访问链接'),
      emailPlaceholder: text('pay.paywallEmailPlaceholder', '你的邮箱（用于接收链接）'),
      errorMessage: text('pay.paywallErrorMessage', '跳转失败，请稍后重试'),
      submittingLabel: text('pay.paywallSubmittingLabel', '跳转支付中…'),
      submitLabel: text('pay.paywallSubmitLabel', '打赏 ¥{price} 解锁 →'),
      providerHint: text('pay.paywallProviderHint', '由 Stripe 提供安全支付'),
    },
    engagement: {
      readStatLabel: text('article.readStatLabel', '阅读'),
      likeStatLabel: text('article.likeStatLabel', '点赞'),
      shareStatLabel: text('article.shareStatLabel', '转发'),
      commentStatLabel: text('article.commentStatLabel', '评论'),
      likeActionLabel: text('article.likeActionLabel', '点赞'),
      likedActionLabel: text('article.likedActionLabel', '已点赞'),
      processingLabel: text('article.processingLabel', '处理中…'),
      copyLinkActionLabel: text('article.copyLinkActionLabel', '复制链接'),
      copyingLinkLabel: text('article.copyingLinkLabel', '复制中…'),
      posterActionLabel: text('article.posterActionLabel', '生成海报'),
      posterGeneratingLabel: text('article.posterGeneratingLabel', '生成中…'),
      commentActionLabel: text('article.commentActionLabel', '去评论'),
      interactionHint: text('article.interactionHint', '《{title}》的阅读、点赞、转发和评论都会进入后台互动统计。'),
      sharePreviewTitle: text('article.sharePreviewTitle', '文章海报预览'),
      sharePreviewSubtitle: text('article.sharePreviewSubtitle', '可先预览，再自行复制或保存'),
      copyPosterActionLabel: text('article.copyPosterActionLabel', '复制海报'),
      copyPosterCopyingLabel: text('article.copyPosterCopyingLabel', '复制中…'),
      closeLabel: text('article.closeLabel', '关闭'),
      posterMobileHint: text('article.posterMobileHint', '移动端可长按海报保存，桌面端可右键另存为。'),
      copyLinkSuccess: text('article.copyLinkSuccess', '文章链接已复制，去转发吧。'),
      copyLinkError: text('article.copyLinkError', '复制链接失败，请稍后重试。'),
      posterGenerateSuccess: text('article.posterGenerateSuccess', '分享海报已生成，可预览后自行复制或保存。'),
      posterGenerateError: text('article.posterGenerateError', '分享图生成失败'),
      copyPosterSuccess: text('article.copyPosterSuccess', '海报已复制到剪贴板。'),
      copyPosterError: text('article.copyPosterError', '复制海报失败，请稍后重试。'),
      copyPosterUnsupportedError: text('article.copyPosterUnsupportedError', '当前浏览器不支持复制图片，请长按或右键保存。'),
      likeError: text('article.likeError', '点赞失败'),
    },
    comments: {
      sectionTitle: text('article.commentSectionTitle', '评论'),
      emptyText: text('article.commentEmptyText', '还没有评论，来说第一句话吧 ✍️'),
      formTitle: text('article.commentFormTitle', '留下你的足迹'),
      nicknameLabel: text('article.commentNicknameLabel', '昵称 *'),
      nicknamePlaceholder: text('article.commentNicknamePlaceholder', '你的名字'),
      emailLabel: text('article.commentEmailLabel', '邮箱'),
      emailOptionalLabel: text('article.commentEmailOptionalLabel', '（可选）'),
      emailPlaceholder: text('article.commentEmailPlaceholder', 'your@email.com'),
      contentLabel: text('article.commentContentLabel', '评论 *'),
      contentPlaceholder: text('article.commentContentPlaceholder', '说点什么吧…'),
      submitLabel: text('article.commentSubmitLabel', '发表评论'),
      submittingLabel: text('article.commentSubmittingLabel', '提交中…'),
      requiredError: text('article.commentRequiredError', '请填写昵称和评论内容'),
      successMessage: text('article.commentSuccessMessage', '评论已提交，审核通过后即可显示 🎉'),
      errorMessage: text('article.commentErrorMessage', '提交失败，请稍后重试'),
    },
    related: {
      eyebrow: text('article.relatedEyebrow', 'More'),
      title: text('article.relatedTitle', '继续阅读'),
      archiveLabel: text('article.relatedArchiveLabel', '时间归档 →'),
      passwordBadgeLabel: text('article.relatedPasswordBadgeLabel', '🔒 加密'),
      paidBadgeLabel: text('article.relatedPaidBadgeLabel', '💰 打赏'),
    },
    markdown: {
      backLabel: text('article.markdownBackLabel', '← 返回首页'),
      updatedAtPrefix: text('article.updatedAtPrefix', '更新于'),
      readingTimeSuffix: text('article.readingTimeSuffix', '分钟阅读'),
    },
  }
}

function buildLegacyArticleDescription(article: Pick<LegacyArticle, 'accessType' | 'price' | 'excerpt' | 'content'>) {
  return summarizeText(
    getRestrictedArticlePreview(article.accessType, article.price) || article.excerpt || article.content,
    180,
  ) || '历史文章内容'
}

function buildLegacyMetadataDescription(article: LegacyArticleMetadataRecord) {
  return getRestrictedArticlePreview(article.accessType, article.price) || article.excerpt || '历史文章内容'
}

function buildMarkdownMetadata(site: SiteSeoData, post: BlogPost, slug: string): Metadata {
  const images = buildSeoImageCandidates(post.coverImage, site.coverImage, site.authorImage, site.favicon)

  return {
    title: post.title,
    description: post.description,
    keywords: [post.title, ...post.tags].filter(Boolean),
    alternates: {
      canonical: `/blog/${slug}`,
    },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.description,
      url: absoluteUrl(`/blog/${slug}`),
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

function buildLegacyMetadata(site: SiteSeoData, article: LegacyArticleMetadataRecord, slug: string): Metadata {
  const description = buildLegacyMetadataDescription(article)
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

export async function getArticleRouteMetadata(slug: string): Promise<Metadata> {
  const [site, legacyArticle] = await Promise.all([
    getSiteSeoData(),
    getLegacyArticleTitleBySlug(slug),
  ])

  if (legacyArticle) {
    return buildLegacyMetadata(site, legacyArticle, slug)
  }

  const markdownPost = await getPostBySlug(slug)
  if (!markdownPost) {
    return { title: '文章', description: '历史文章内容' }
  }

  return buildMarkdownMetadata(site, markdownPost, slug)
}

export async function getBlogRouteMetadata(slug: string): Promise<Metadata> {
  const [site, legacyArticle] = await Promise.all([
    getSiteSeoData(),
    getLegacyArticleTitleBySlug(slug),
  ])

  if (legacyArticle) {
    return buildLegacyMetadata(site, legacyArticle, slug)
  }

  const markdownPost = await getPostBySlug(slug)
  if (!markdownPost) {
    return { title: '文章未找到' }
  }

  return buildMarkdownMetadata(site, markdownPost, slug)
}

export async function getLegacyArticlePageData(slug: string, token?: string) {
  const [site, article, copy] = await Promise.all([
    getSiteSeoData(),
    getLegacyArticleBySlug(slug),
    getArticlePageCopy(),
  ])

  if (!article) return null

  let tokenValid = false
  if (article.accessType === 'PAID' && token) {
    tokenValid = await hasLegacyArticleTokenAccess(article.id, token)
  }

  const [engagement, relatedPosts] = await Promise.all([
    getArticleEngagementSummary(article.id),
    getRelatedPosts(slug, [], 3),
  ])

  const comments: ArticleComment[] = article.comments.map(comment => ({
    ...comment,
    email: comment.email ?? undefined,
    createdAt: comment.createdAt.toISOString(),
  }))

  return {
    site,
    article,
    tokenValid,
    comments,
    engagement,
    relatedPosts,
    copy,
    description: buildLegacyArticleDescription(article),
    readingTimeMinutes: Math.max(1, Math.ceil(article.content.replace(/\s+/g, '').length / 320)),
    isAccessibleForFree: article.accessType === 'PUBLIC' || tokenValid,
    breadcrumbs: buildBreadcrumbSchema([
      { name: '博客', path: '/blog' },
      { name: article.title, path: `/article/${slug}` },
    ]),
  }
}

export async function getMarkdownArticlePageData(slug: string) {
  const [site, post, copy] = await Promise.all([
    getSiteSeoData(),
    getPostBySlug(slug),
    getArticlePageCopy(),
  ])

  if (!post) return null

  const [engagement, relatedPosts] = await Promise.all([
    getArticleEngagementSeedBySlug(slug),
    getRelatedPosts(slug, post.tags, 3),
  ])

  return {
    site,
    post,
    engagement,
    relatedPosts,
    copy,
    description: post.description,
    breadcrumbs: buildBreadcrumbSchema([
      { name: '博客', path: '/blog' },
      { name: post.title, path: `/blog/${slug}` },
    ]),
  }
}

export type { ArticleEngagementSummary }
