import type { ReactNode } from 'react'

import BlogPageFrame from '@/components/blog/BlogPageFrame'

type BlogArticleFrameProps = {
  title: string
  mood?: string | null
  badges?: ReactNode
  meta?: ReactNode
  afterHeader?: ReactNode
  coverImage?: string | null
  coverImageAlt?: string
  children: ReactNode
  footer?: ReactNode
  titleClassName?: string
}

export default function BlogArticleFrame({
  title,
  mood,
  badges,
  meta,
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
        {mood || badges ? (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {mood ? <span className="text-2xl">{mood}</span> : null}
            {badges}
          </div>
        ) : null}
        <h1 className={titleClassName}>{title}</h1>
        {meta ? <div className="text-sm text-[var(--text-subtle)]">{meta}</div> : null}
        {afterHeader ? <div className="mt-4">{afterHeader}</div> : null}
      </header>

      {coverImage ? (
        <div className="mb-8 overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--surface-bg)]">
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
