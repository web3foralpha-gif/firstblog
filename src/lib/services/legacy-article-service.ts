import 'server-only'

import { runWithDatabase } from '@/lib/db'

export type LegacyComment = {
  id: string
  nickname: string
  email: string | null
  content: string
  createdAt: Date
}

export type LegacyArticle = {
  id: string
  slug: string
  title: string
  content: string
  mood: string
  accessType: string
  price: number | null
  passwordHint: string | null
  createdAt: Date
  comments: LegacyComment[]
}

export async function getLegacyArticleTitleBySlug(slug: string) {
  return runWithDatabase(
    async db => {
      const article = await db.article.findFirst({
        where: { slug, published: true },
        select: { title: true, excerpt: true },
      })

      if (!article) return null
      return article
    },
    null,
    'legacy_article_title',
  )
}

export async function getLegacyArticleBySlug(slug: string): Promise<LegacyArticle | null> {
  return runWithDatabase(
    async db =>
      db.article.findFirst({
        where: { slug, published: true },
        include: {
          comments: {
            where: { status: 'APPROVED' },
            orderBy: { createdAt: 'asc' },
            select: { id: true, nickname: true, email: true, content: true, createdAt: true },
          },
        },
      }),
    null,
    'legacy_article_detail',
  )
}

export async function hasLegacyArticleTokenAccess(articleId: string, token: string) {
  const payment = await runWithDatabase(
    async db =>
      db.payment.findFirst({
        where: {
          articleId,
          accessToken: token,
          status: 'COMPLETED',
          OR: [{ tokenExpiresAt: null }, { tokenExpiresAt: { gt: new Date() } }],
        },
        select: { id: true },
      }),
    null,
    'legacy_article_token',
  )

  return Boolean(payment)
}
