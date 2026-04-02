import Link from 'next/link'

import type { BlogPostSummary } from '@/lib/posts'
import { formatDate } from '@/lib/utils'

type RelatedPostsProps = {
  posts: BlogPostSummary[]
  title?: string
  eyebrow?: string
  archiveLabel?: string
  passwordBadgeLabel?: string
  paidBadgeLabel?: string
}

function renderAccessBadge(post: BlogPostSummary, passwordBadgeLabel: string, paidBadgeLabel: string) {
  if (post.accessType === 'PASSWORD') {
    return <span className="badge badge-password">{passwordBadgeLabel}</span>
  }

  if (post.accessType === 'PAID') {
    return <span className="badge badge-paid">{paidBadgeLabel}</span>
  }

  return null
}

export default function RelatedPosts({
  posts,
  title = '继续阅读',
  eyebrow = 'More',
  archiveLabel = '时间归档 →',
  passwordBadgeLabel = '🔒 加密',
  paidBadgeLabel = '💰 打赏',
}: RelatedPostsProps) {
  if (posts.length === 0) return null

  return (
    <section className="mt-12 border-t border-[var(--border-color)] pt-6">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.26em] text-[var(--text-faint)]">{eyebrow}</p>
          <h2 className="mt-2 font-serif text-2xl font-medium text-[var(--text-primary)]">{title}</h2>
        </div>
        <Link href="/archive" className="text-sm text-[var(--text-subtle)] transition-colors hover:text-[var(--accent)]">
          {archiveLabel}
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {posts.map(post => (
          <Link
            key={`${post.href || `/article/${post.slug}`}-${post.slug}`}
            href={post.href || `/article/${post.slug}`}
            className="group rounded-[24px] border border-[var(--border-color)] bg-[var(--surface-soft)]/70 p-4 shadow-[0_16px_40px_rgba(61,53,48,0.06)] transition-all hover:-translate-y-0.5 hover:border-[var(--accent)]"
          >
            <div className="flex items-center gap-2 text-xs text-[var(--text-faint)]">
              <span className="text-base">{post.mood}</span>
              <time>{formatDate(post.updatedAt || post.publishedAt)}</time>
            </div>

            <h3 className="mt-3 line-clamp-2 font-serif text-lg font-medium leading-7 text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent)]">
              {post.title}
            </h3>

            {post.excerpt ? (
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--text-subtle)]">{post.excerpt}</p>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {renderAccessBadge(post, passwordBadgeLabel, paidBadgeLabel)}
              {post.tags.slice(0, 2).map(tag => (
                <span key={`${post.slug}-${tag}`} className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] text-[var(--text-subtle)]">
                  #{tag}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
