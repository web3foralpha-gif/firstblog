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
  readingTimeMinutes?: number
  tags?: string[]
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
  readingTimeMinutes = 0,
  tags = [],
}: ArticleCardProps) {
  const previewText = getRestrictedArticlePreview(accessType, price) || excerpt
  const hasCover = Boolean(coverImage)
  const isRestricted = accessType === 'PASSWORD' || accessType === 'PAID'
  const coverHint = accessType === 'PASSWORD' ? '🔒 需要密码' : accessType === 'PAID' ? `💰 ¥${price || ''}` : ''
  const visibleTags = tags.filter(Boolean).slice(0, 2)
  const targetHref = href || `/article/${slug}`

  return (
    <Link href={targetHref} className="group block">
      <article className="card min-h-[164px] overflow-hidden px-4 py-4 transition-transform active:scale-[0.99] sm:px-5 sm:py-5">
        <div
          className={
            hasCover
              ? 'grid h-full items-center gap-4 lg:grid-cols-[minmax(0,1fr)_240px]'
              : 'flex min-h-full min-w-0 flex-col'
          }
        >
          <div className="flex h-full min-w-0 flex-col justify-between">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl border border-[var(--border-soft)] bg-[var(--accent-soft)] text-base leading-none shadow-inner shadow-white/70">
                  {mood}
                </span>
                {pinned ? <span className="badge badge-pinned">📌 置顶</span> : null}
                {accessBadge[accessType]}
                {accessType === 'PAID' && price ? <span className="badge badge-paid">¥{price}</span> : null}
              </div>

              <h2 className="font-serif text-[18px] font-medium leading-8 text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent)] sm:text-[19px]">
                {title}
              </h2>

              {previewText ? (
                <p className="mt-3 line-clamp-3 text-[13px] leading-6 text-[var(--text-muted)] sm:text-sm">{previewText}</p>
              ) : null}

              {visibleTags.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {visibleTags.map(tag => (
                    <span key={`${slug}-${tag}`} className="theme-chip !px-3 !py-1.5 !text-[11px] !shadow-none">
                      #{tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-[var(--text-subtle)] sm:text-xs">
              <span className="theme-chip !px-3 !py-1.5 !shadow-none">{formatDate(createdAt)}</span>
              {readingTimeMinutes > 0 ? <span className="theme-chip !px-3 !py-1.5 !shadow-none">{readingTimeMinutes} 分钟阅读</span> : null}
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-soft)] bg-white/72 px-3 py-1.5 text-[var(--text-subtle)] transition-colors group-hover:border-[var(--accent)] group-hover:text-[var(--accent)]">
                读全文
                <span aria-hidden="true">→</span>
              </span>
            </div>
          </div>

          {hasCover ? (
            <div className="relative overflow-hidden rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface-soft)]">
              <img
                src={coverImage}
                alt={title}
                className="block aspect-[4/3] h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                loading="lazy"
              />

              {isRestricted ? <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(15,23,42,0.14))]" /> : null}

              {isRestricted ? (
                <div className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium text-[var(--text-secondary)] shadow-sm backdrop-blur">
                  {coverHint}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </article>
    </Link>
  )
}
