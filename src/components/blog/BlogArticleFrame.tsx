import type { ReactNode } from 'react'

import BlogPageFrame from '@/components/blog/BlogPageFrame'

type BlogArticleFrameProps = {
  title: string
  eyebrow?: string
  mood?: string | null
  badges?: ReactNode
  meta?: ReactNode
  breadcrumbs?: ReactNode
  summary?: ReactNode
  afterHeader?: ReactNode
  coverImage?: string | null
  coverImageAlt?: string
  children: ReactNode
  footer?: ReactNode
  titleClassName?: string
}

export default function BlogArticleFrame({
  title,
  eyebrow,
  mood,
  badges,
  meta,
  breadcrumbs,
  summary,
  afterHeader,
  coverImage,
  coverImageAlt,
  children,
  footer,
  titleClassName = 'mb-3 font-serif text-2xl font-medium leading-snug text-[var(--text-primary)] sm:text-3xl',
}: BlogArticleFrameProps) {
  return (
    <BlogPageFrame compactFooter mainClassName="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="mb-10">
        <div className="theme-panel overflow-hidden px-5 py-6 sm:px-7 sm:py-7">
          <div className="relative z-[1]">
            {breadcrumbs ? <div className="mb-4 text-sm text-[var(--text-subtle)]">{breadcrumbs}</div> : null}

            {eyebrow || mood || badges ? (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {eyebrow ? (
                  <span className="text-xs font-medium uppercase tracking-[0.24em] text-[var(--text-faint)]">
                    {eyebrow}
                  </span>
                ) : null}
                {mood ? (
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--border-soft)] bg-[var(--accent-soft)] text-xl shadow-inner shadow-white/70">
                    {mood}
                  </span>
                ) : null}
                {badges}
              </div>
            ) : null}

            <h1 className={titleClassName}>{title}</h1>
            {summary ? <div className="max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">{summary}</div> : null}
            {meta ? <div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-[var(--text-subtle)]">{meta}</div> : null}
            {afterHeader ? <div className="mt-5">{afterHeader}</div> : null}
          </div>
        </div>
      </header>

      {coverImage ? (
        <div className="mb-8 overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--surface-bg)] shadow-[0_22px_56px_rgba(61,53,48,0.08)]">
          <img
            src={coverImage}
            alt={coverImageAlt || title}
            className="block h-auto w-full"
            loading="eager"
          />
        </div>
      ) : null}

      {children}
      {footer ? <div className="mt-12">{footer}</div> : null}
    </BlogPageFrame>
  )
}
