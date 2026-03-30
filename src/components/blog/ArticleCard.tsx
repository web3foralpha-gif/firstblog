import Link from 'next/link'
import { getRestrictedArticlePreview } from '@/lib/article-access'
import { formatDate } from '@/lib/utils'

type ArticleCardProps = {
  slug: string
  title: string
  excerpt: string | null
  mood: string
  coverImage?: string
  href?: string
  pinned?: boolean
  accessType: 'PUBLIC' | 'PASSWORD' | 'PAID'
  price: number | null
  createdAt: Date | string
}

const accessBadge = {
  PUBLIC: null,
  PASSWORD: <span className="badge badge-password">🔒 加密</span>,
  PAID: <span className="badge badge-paid">💰 打赏</span>,
}

export default function ArticleCard({
  slug,
  title,
  excerpt,
  mood,
  coverImage,
  href,
  pinned = false,
  accessType,
  price,
  createdAt,
}: ArticleCardProps) {
  const previewText = getRestrictedArticlePreview(accessType, price) || excerpt
  const hasCover = Boolean(coverImage)
  const isRestricted = accessType === 'PASSWORD' || accessType === 'PAID'
  const coverHint = accessType === 'PASSWORD' ? '🔒 需要密码' : accessType === 'PAID' ? `💰 ¥${price || ''}` : ''

  return (
    <Link href={href || `/article/${slug}`} className="block group">
      <article className="card min-h-[162px] overflow-hidden px-4 py-4 transition-transform active:scale-[0.99] sm:min-h-[176px] sm:px-5 sm:py-[18px]">
        <div
          className={
            hasCover
              ? 'grid h-full items-center gap-4 sm:grid-cols-[minmax(0,1fr)_188px] sm:gap-5 lg:grid-cols-[minmax(0,1fr)_224px]'
              : 'flex min-h-full min-w-0 flex-col'
          }
        >
          <div className="flex h-full min-w-0 flex-col justify-between">
            <div>
              <div className="mb-2.5 flex items-center gap-2 flex-wrap">
                <span className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl border border-[var(--border-soft)] bg-[var(--accent-soft)] text-base leading-none shadow-inner shadow-white/70">
                  {mood}
                </span>
                {pinned && <span className="badge badge-pinned">📌 置顶</span>}
                {accessBadge[accessType]}
                <h2 className="min-w-0 flex-1 font-serif text-[16px] font-medium leading-8 text-[var(--text-primary)] transition-colors line-clamp-2 group-hover:text-[var(--accent)] sm:text-[17px]">
                  {title}
                </h2>
              </div>

              {previewText && (
                <p className="line-clamp-2 text-[13px] leading-6 text-[var(--text-muted)]">{previewText}</p>
              )}
            </div>

            <div className="mt-3 flex items-center flex-wrap gap-2 sm:gap-3">
              <time className="theme-chip !px-3 !py-1.5 !text-[11px] !shadow-none">{formatDate(createdAt)}</time>
              {accessType === 'PAID' && price && (
                <span className="theme-chip !px-3 !py-1.5 !text-[11px] !shadow-none">¥{price}</span>
              )}
            </div>
          </div>

          {hasCover && (
            <div className="relative overflow-hidden rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface-soft)]">
              <img
                src={coverImage}
                alt={title}
                className="block aspect-[4/3] h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                loading="lazy"
              />

              {isRestricted && (
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(15,23,42,0.14))]" />
              )}

              {isRestricted && (
                <div className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium text-[var(--text-secondary)] shadow-sm backdrop-blur">
                  {coverHint}
                </div>
              )}
            </div>
          )}
        </div>
      </article>
    </Link>
  )
}
