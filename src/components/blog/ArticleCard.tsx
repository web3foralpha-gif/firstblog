import Link from 'next/link'
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
  return (
    <Link href={href || `/article/${slug}`} className="block group">
      <article className="card px-4 sm:px-6 py-4 sm:py-5 active:scale-[0.99] transition-transform">
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-lg leading-none flex-shrink-0">{mood}</span>
              {pinned && <span className="badge badge-pinned">📌 置顶</span>}
              <h2 className="font-serif text-[16px] sm:text-[17px] font-medium text-[var(--text-primary)] transition-colors line-clamp-2 group-hover:text-[var(--accent)] sm:truncate">
                {title}
              </h2>
            </div>
            {excerpt && (
              <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-[var(--text-muted)]">{excerpt}</p>
            )}
            <div className="flex items-center flex-wrap gap-2 sm:gap-3 mt-3">
              <time className="text-[12px] text-[var(--text-subtle)]">{formatDate(createdAt)}</time>
              {accessBadge[accessType]}
              {accessType === 'PAID' && price && (
                <span className="text-[12px] text-[var(--accent-strong)]">¥{price}</span>
              )}
            </div>
          </div>
          <span className="mt-1 flex-shrink-0 text-lg text-[var(--text-faint)] transition-colors group-hover:text-[var(--accent)]">→</span>
        </div>
      </article>
    </Link>
  )
}
