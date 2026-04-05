import type { ReactNode } from 'react'

import BlogTheme from '@/components/blog/BlogTheme'
import Header from '@/components/blog/Header'
import PikachuWidget from '@/components/blog/PikachuWidget'
import SiteFooter from '@/components/blog/SiteFooter'

type BlogPageFrameProps = {
  children: ReactNode
  compactFooter?: boolean
  mainClassName?: string
  showMascot?: boolean
}

export default function BlogPageFrame({
  children,
  compactFooter = false,
  mainClassName = 'mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10',
  showMascot = true,
}: BlogPageFrameProps) {
  return (
    <BlogTheme>
      <div className="min-h-screen">
        <Header />
        <main className={mainClassName}>{children}</main>
        <SiteFooter compact={compactFooter} />
        {showMascot ? <PikachuWidget /> : null}
      </div>
    </BlogTheme>
  )
}
