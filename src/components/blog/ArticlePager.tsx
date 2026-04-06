import Link from 'next/link'

import type { BlogPostSummary } from '@/lib/posts'
import { formatDate } from '@/lib/utils'

type ArticlePagerProps = {
  newer: BlogPostSummary | null
  older: BlogPostSummary | null
  homeLabel?: string
  archiveLabel?: string
}

function PagerCard({
  label,
  post,
}: {
  label: string
  post: BlogPostSummary | null
}) {
  if (!post) {
    return (
      <div className="rounded-[24px] border border-dashed border-[var(--border-color)] bg-white/45 p-4 text-sm text-[var(--text-subtle)]">
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-faint)]">{label}</p>
        <p className="mt-3 leading-6">这一侧暂时没有更多文章了。</p>
      </div>
    )
  }

  return (
    <Link
      href={post.href || `/article/${post.slug}`}
      className="group block rounded-[24px] border border-[var(--border-color)] bg-white/70 p-4 transition-all hover:-translate-y-0.5 hover:border-[var(--accent)]"
    >
      <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-faint)]">{label}</p>
      <div className="mt-3 flex items-center gap-2 text-xs text-[var(--text-subtle)]">
        <span className="text-base">{post.mood}</span>
        <time>{formatDate(post.updatedAt || post.publishedAt)}</time>
      </div>
      <h3 className="mt-3 font-serif text-lg font-medium leading-7 text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent)]">
        {post.title}
      </h3>
      {post.excerpt ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--text-subtle)]">{post.excerpt}</p> : null}
    </Link>
  )
}

export default function ArticlePager({
  newer,
  older,
  homeLabel = '回首页',
  archiveLabel = '看归档',
}: ArticlePagerProps) {
  return (
    <section className="theme-panel-soft p-4 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-faint)]">Continue</p>
          <h2 className="mt-2 font-serif text-2xl font-medium text-[var(--text-primary)]">继续看看</h2>
        </div>
        <div className="flex flex-wrap gap-2 text-sm text-[var(--text-subtle)]">
          <Link href="/" className="rounded-full border border-[var(--border-soft)] px-3 py-1.5 transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]">
            {homeLabel}
          </Link>
          <Link href="/archive" className="rounded-full border border-[var(--border-soft)] px-3 py-1.5 transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]">
            {archiveLabel}
          </Link>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <PagerCard label="更新一点" post={newer} />
        <PagerCard label="更早一点" post={older} />
      </div>
    </section>
  )
}
