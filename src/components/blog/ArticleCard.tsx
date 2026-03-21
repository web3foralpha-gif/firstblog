import Link from 'next/link'
import { getRestrictedArticlePreview } from '@/lib/article-access'
import { formatDate } from '@/lib/utils'

type ArticleCardProps = {
  slug: string
  title: string
  excerpt: string | null
  mood: string
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

export default function ArticleCard({ slug, title, excerpt, mood, href, pinned = false, accessType, price, createdAt }: ArticleCardProps) {
  const previewText = getRestrictedArticlePreview(accessType, price) || excerpt

  return (
    <Link href={href || `/article/${slug}`} className="block group">
      <article className="card px-4 py-4 transition-transform active:scale-[0.99] sm:px-6 sm:py-5">
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <div className="mb-3 flex items-center gap-2 flex-wrap">
              <span className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-[var(--border-soft)] bg-[var(--accent-soft)] text-lg leading-none shadow-inner shadow-white/70">
                {mood}
              </span>
              {pinned && <span className="badge badge-pinned">📌 置顶</span>}
              {accessBadge[accessType]}
              <h2 className="font-serif text-[16px] sm:text-[17px] font-medium text-[var(--text-primary)] transition-colors line-clamp-2 group-hover:text-[var(--accent)] sm:truncate">
                {title}
              </h2>
            </div>
            {previewText && (
              <p className="line-clamp-2 text-[13px] leading-7 text-[var(--text-muted)]">{previewText}</p>
            )}
            <div className="mt-4 flex items-center flex-wrap gap-2 sm:gap-3">
              <time className="theme-chip !px-3 !py-1.5 !text-[11px] !shadow-none">{formatDate(createdAt)}</time>
              {accessType === 'PAID' && price && (
                <span className="theme-chip !px-3 !py-1.5 !text-[11px] !shadow-none">¥{price}</span>
              )}
            </div>
          </div>
          <span className="mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-[var(--border-soft)] bg-white/60 text-lg text-[var(--text-faint)] transition-colors group-hover:border-[var(--accent)] group-hover:text-[var(--accent)]">→</span>
        </div>
      </article>
    </Link>
  )
}
