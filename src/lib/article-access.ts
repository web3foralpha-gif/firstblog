export type ArticleAccessType = 'PUBLIC' | 'PASSWORD' | 'PAID'

export function normalizeArticleAccessType(accessType: string | null | undefined): ArticleAccessType {
  if (accessType === 'PASSWORD' || accessType === 'PAID') {
    return accessType
  }

  return 'PUBLIC'
}

export function getRestrictedArticlePreview(accessType: string | null | undefined, price?: number | null) {
  const normalized = normalizeArticleAccessType(accessType)

  if (normalized === 'PASSWORD') {
    return '这是一篇加密文章，输入密码后继续阅读。'
  }

  if (normalized === 'PAID') {
    return typeof price === 'number' && price > 0
      ? `这是一篇付费文章，解锁后可阅读全文（¥${price}）。`
      : '这是一篇付费文章，解锁后可阅读全文。'
  }

  return null
}
