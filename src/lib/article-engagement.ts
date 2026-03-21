import 'server-only'

import type { Prisma } from '@prisma/client'
import type { NextRequest } from 'next/server'
import { runWithDatabase } from '@/lib/db'
import { prisma } from '@/lib/prisma'
import { getGeoInfo } from '@/lib/geo'

export type ArticleEngagementSummary = {
  articleId: string
  viewCount: number
  qualifiedViewCount: number
  uniqueVisitorCount: number
  likeCount: number
  shareCount: number
  shareLinkCount: number
  shareImageCount: number
  commentCount: number
  likedByVisitor: boolean
}

type RequestContext = {
  ipAddress: string
  ipRegion: string | null
  ipCity: string | null
  userAgent: string
}

type InteractionPayload = {
  articleId: string
  visitorId: string
  sessionId?: string | null
  path?: string | null
  referrer?: string | null
  duration?: number | null
  scrollDepth?: number | null
  channel?: string | null
  metadata?: Record<string, unknown> | null
}

function sanitizeReferrer(referrer: string | null | undefined) {
  if (!referrer) return null
  return referrer.trim().slice(0, 500) || null
}

function clampDuration(duration: number | null | undefined) {
  if (typeof duration !== 'number' || !Number.isFinite(duration) || duration <= 0) return null
  return Math.min(Math.round(duration), 60 * 60 * 12)
}

function clampScrollDepth(depth: number | null | undefined) {
  if (typeof depth !== 'number' || !Number.isFinite(depth) || depth < 0) return null
  return Math.max(0, Math.min(100, Math.round(depth)))
}

function toJsonMetadata(
  metadata: Record<string, unknown> | null | undefined,
): Prisma.InputJsonValue | undefined {
  if (!metadata) return undefined
  return JSON.parse(JSON.stringify(metadata)) as Prisma.InputJsonValue
}

async function buildRequestContext(req: NextRequest): Promise<RequestContext> {
  const forwarded = req.headers.get('x-forwarded-for')
  const ipAddress = forwarded ? forwarded.split(',')[0].trim() : req.headers.get('x-real-ip') || '127.0.0.1'
  const userAgent = (req.headers.get('user-agent') || '').slice(0, 200)
  const geo = await getGeoInfo(ipAddress)

  return {
    ipAddress,
    ipRegion: geo?.region || null,
    ipCity: geo?.city || null,
    userAgent,
  }
}

async function upsertAggregate(articleId: string, data: {
  viewCount?: number
  qualifiedViewCount?: number
  uniqueVisitorCount?: number
  likeCount?: number
  shareCount?: number
  shareLinkCount?: number
  shareImageCount?: number
  commentCount?: number
}) {
  await prisma.articleAggregate.upsert({
    where: { articleId },
    create: {
      articleId,
      viewCount: data.viewCount ?? 0,
      qualifiedViewCount: data.qualifiedViewCount ?? 0,
      uniqueVisitorCount: data.uniqueVisitorCount ?? 0,
      likeCount: data.likeCount ?? 0,
      shareCount: data.shareCount ?? 0,
      shareLinkCount: data.shareLinkCount ?? 0,
      shareImageCount: data.shareImageCount ?? 0,
      commentCount: data.commentCount ?? 0,
    },
    update: {
      ...(data.viewCount ? { viewCount: { increment: data.viewCount } } : {}),
      ...(data.qualifiedViewCount ? { qualifiedViewCount: { increment: data.qualifiedViewCount } } : {}),
      ...(data.uniqueVisitorCount ? { uniqueVisitorCount: { increment: data.uniqueVisitorCount } } : {}),
      ...(data.likeCount ? { likeCount: { increment: data.likeCount } } : {}),
      ...(data.shareCount ? { shareCount: { increment: data.shareCount } } : {}),
      ...(data.shareLinkCount ? { shareLinkCount: { increment: data.shareLinkCount } } : {}),
      ...(data.shareImageCount ? { shareImageCount: { increment: data.shareImageCount } } : {}),
      ...(data.commentCount ? { commentCount: { increment: data.commentCount } } : {}),
    },
  })
}

async function createInteraction(
  type: string,
  payload: InteractionPayload,
  context: RequestContext,
) {
  await prisma.articleInteraction.create({
    data: {
      articleId: payload.articleId,
      visitorId: payload.visitorId,
      sessionId: payload.sessionId || null,
      type,
      channel: payload.channel || null,
      path: payload.path || null,
      duration: clampDuration(payload.duration),
      scrollDepth: clampScrollDepth(payload.scrollDepth),
      referrer: sanitizeReferrer(payload.referrer),
      ipAddress: context.ipAddress,
      ipRegion: context.ipRegion,
      ipCity: context.ipCity,
      userAgent: context.userAgent,
      metadata: toJsonMetadata(payload.metadata),
    },
  })
}

export async function getArticleEngagementSummary(articleId: string, visitorId?: string | null): Promise<ArticleEngagementSummary> {
  const fallbackSummary: ArticleEngagementSummary = {
    articleId,
    viewCount: 0,
    qualifiedViewCount: 0,
    uniqueVisitorCount: 0,
    likeCount: 0,
    shareCount: 0,
    shareLinkCount: 0,
    shareImageCount: 0,
    commentCount: 0,
    likedByVisitor: false,
  }

  return runWithDatabase(
    async db => {
      const [aggregate, reaction, commentCount] = await Promise.all([
        db.articleAggregate.findUnique({ where: { articleId } }),
        visitorId
          ? db.articleReactionState.findUnique({
              where: { articleId_visitorId: { articleId, visitorId } },
            })
          : null,
        db.comment.count({ where: { articleId } }),
      ])

      return {
        articleId,
        viewCount: aggregate?.viewCount ?? 0,
        qualifiedViewCount: aggregate?.qualifiedViewCount ?? 0,
        uniqueVisitorCount: aggregate?.uniqueVisitorCount ?? 0,
        likeCount: aggregate?.likeCount ?? 0,
        shareCount: aggregate?.shareCount ?? 0,
        shareLinkCount: aggregate?.shareLinkCount ?? 0,
        shareImageCount: aggregate?.shareImageCount ?? 0,
        commentCount: aggregate?.commentCount ?? commentCount,
        likedByVisitor: Boolean(reaction?.liked),
      }
    },
    fallbackSummary,
    'article_engagement_summary',
  )
}

export async function getArticleEngagementSeedBySlug(slug: string) {
  return runWithDatabase(
    async db => {
      const article = await db.article.findFirst({
        where: { slug, published: true },
        select: {
          id: true,
          slug: true,
          title: true,
          excerpt: true,
          coverImage: true,
          accessType: true,
          aggregate: true,
          _count: { select: { comments: true } },
        },
      })

      if (!article) return null

      return {
        articleId: article.id,
        slug: article.slug,
        title: article.title,
        excerpt: article.excerpt,
        coverImage: article.coverImage,
        accessType: article.accessType,
        summary: {
          articleId: article.id,
          viewCount: article.aggregate?.viewCount ?? 0,
          qualifiedViewCount: article.aggregate?.qualifiedViewCount ?? 0,
          uniqueVisitorCount: article.aggregate?.uniqueVisitorCount ?? 0,
          likeCount: article.aggregate?.likeCount ?? 0,
          shareCount: article.aggregate?.shareCount ?? 0,
          shareLinkCount: article.aggregate?.shareLinkCount ?? 0,
          shareImageCount: article.aggregate?.shareImageCount ?? 0,
          commentCount: article.aggregate?.commentCount ?? article._count.comments,
          likedByVisitor: false,
        },
      }
    },
    null,
    'article_engagement_seed',
  )
}

export async function recordArticleViewEnter(req: NextRequest, payload: InteractionPayload) {
  const context = await buildRequestContext(req)
  const existingVisitor = await prisma.articleInteraction.findFirst({
    where: {
      articleId: payload.articleId,
      visitorId: payload.visitorId,
    },
    select: { id: true },
  })

  await prisma.$transaction([
    prisma.pageView.create({
      data: {
        sessionId: payload.sessionId || payload.visitorId,
        visitorId: payload.visitorId,
        articleId: payload.articleId,
        ipAddress: context.ipAddress,
        ipRegion: context.ipRegion,
        ipCity: context.ipCity,
        path: payload.path || `/article/${payload.articleId}`,
        referrer: sanitizeReferrer(payload.referrer),
        userAgent: context.userAgent,
      },
    }),
    prisma.articleInteraction.create({
      data: {
        articleId: payload.articleId,
        visitorId: payload.visitorId,
        sessionId: payload.sessionId || null,
        type: 'VIEW_ENTER',
        path: payload.path || null,
        referrer: sanitizeReferrer(payload.referrer),
        ipAddress: context.ipAddress,
        ipRegion: context.ipRegion,
        ipCity: context.ipCity,
        userAgent: context.userAgent,
        metadata: toJsonMetadata(payload.metadata),
      },
    }),
    prisma.articleAggregate.upsert({
      where: { articleId: payload.articleId },
      create: {
        articleId: payload.articleId,
        viewCount: 1,
        uniqueVisitorCount: existingVisitor ? 0 : 1,
      },
      update: {
        viewCount: { increment: 1 },
        ...(existingVisitor ? {} : { uniqueVisitorCount: { increment: 1 } }),
      },
    }),
  ])
}

export async function recordArticleQualifiedView(req: NextRequest, payload: InteractionPayload) {
  const existing = await prisma.articleInteraction.findFirst({
    where: {
      articleId: payload.articleId,
      visitorId: payload.visitorId,
      sessionId: payload.sessionId || null,
      type: 'VIEW_QUALIFIED',
    },
    select: { id: true },
  })

  if (existing) return false

  const context = await buildRequestContext(req)
  await createInteraction('VIEW_QUALIFIED', payload, context)
  await upsertAggregate(payload.articleId, { qualifiedViewCount: 1 })
  return true
}

export async function toggleArticleLike(req: NextRequest, payload: InteractionPayload) {
  const context = await buildRequestContext(req)
  const state = await prisma.articleReactionState.findUnique({
    where: { articleId_visitorId: { articleId: payload.articleId, visitorId: payload.visitorId } },
  })

  const nextLiked = !state?.liked
  await prisma.$transaction([
    prisma.articleReactionState.upsert({
      where: { articleId_visitorId: { articleId: payload.articleId, visitorId: payload.visitorId } },
      create: {
        articleId: payload.articleId,
        visitorId: payload.visitorId,
        liked: nextLiked,
        likedAt: nextLiked ? new Date() : null,
      },
      update: {
        liked: nextLiked,
        likedAt: nextLiked ? new Date() : null,
      },
    }),
    prisma.articleInteraction.create({
      data: {
        articleId: payload.articleId,
        visitorId: payload.visitorId,
        sessionId: payload.sessionId || null,
        type: nextLiked ? 'LIKE' : 'UNLIKE',
        path: payload.path || null,
        referrer: sanitizeReferrer(payload.referrer),
        ipAddress: context.ipAddress,
        ipRegion: context.ipRegion,
        ipCity: context.ipCity,
        userAgent: context.userAgent,
      },
    }),
    prisma.articleAggregate.upsert({
      where: { articleId: payload.articleId },
      create: {
        articleId: payload.articleId,
        likeCount: nextLiked ? 1 : 0,
      },
      update: {
        likeCount: { increment: nextLiked ? 1 : -1 },
      },
    }),
  ])

  const summary = await getArticleEngagementSummary(payload.articleId, payload.visitorId)
  return { liked: nextLiked, summary }
}

export async function recordArticleShare(req: NextRequest, payload: InteractionPayload & { mode: 'link' | 'image' }) {
  const context = await buildRequestContext(req)
  await createInteraction(payload.mode === 'image' ? 'SHARE_IMAGE' : 'SHARE_LINK', payload, context)
  await upsertAggregate(payload.articleId, {
    shareCount: 1,
    shareLinkCount: payload.mode === 'link' ? 1 : 0,
    shareImageCount: payload.mode === 'image' ? 1 : 0,
  })
  return getArticleEngagementSummary(payload.articleId, payload.visitorId)
}

export async function recordArticleCommentSubmission(
  req: NextRequest,
  payload: InteractionPayload & { commentId: string; nickname: string },
) {
  const context = await buildRequestContext(req)
  await createInteraction(
    'COMMENT_SUBMIT',
    {
      ...payload,
      metadata: {
        commentId: payload.commentId,
        nickname: payload.nickname,
      },
    },
    context,
  )
  await upsertAggregate(payload.articleId, { commentCount: 1 })
}
