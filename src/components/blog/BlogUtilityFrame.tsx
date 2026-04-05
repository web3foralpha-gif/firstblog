import type { ReactNode } from 'react'

import BlogPageFrame from '@/components/blog/BlogPageFrame'

type BlogUtilityFrameProps = {
  icon?: string
  title: string
  description?: ReactNode
  children?: ReactNode
  actions?: ReactNode
  showMascot?: boolean
}

export default function BlogUtilityFrame({
  icon,
  title,
  description,
  children,
  actions,
  showMascot = false,
}: BlogUtilityFrameProps) {
  return (
    <BlogPageFrame compactFooter showMascot={showMascot} mainClassName="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
      <section className="theme-panel-soft mx-auto max-w-xl px-6 py-10 text-center sm:px-8">
        {icon ? <p className="mb-4 text-5xl">{icon}</p> : null}
        <h1 className="font-serif text-3xl font-medium text-[var(--text-primary)]">{title}</h1>
        {description ? <div className="mt-3 text-sm leading-7 text-[var(--text-subtle)]">{description}</div> : null}
        {children ? <div className="mt-6">{children}</div> : null}
        {actions ? <div className="mt-8 flex flex-wrap items-center justify-center gap-3">{actions}</div> : null}
      </section>
    </BlogPageFrame>
  )
}
