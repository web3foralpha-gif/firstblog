import type { Metadata } from 'next'

import BlogTheme from '@/components/blog/BlogTheme'
import BlogIndexPage from '@/components/blog/BlogIndexPage'
import { getSetting } from '@/lib/settings'
import { getAllPosts } from '@/lib/posts'

export async function generateMetadata(): Promise<Metadata> {
  const title = (await getSetting('blog.homeTitle')).trim() || '博客'
  const description = (await getSetting('blog.homeDescription')).trim() || '写下生活、心情与一些正在发生的小事。'

  return {
    title,
    description,
  }
}

export const revalidate = 3600

const DEFAULT_CORNER_LINES = [
  '适合慢慢读几篇文章，发一会儿呆。',
  '右边的向日葵会记得每一次浇水、施肥和晒太阳。',
  '如果想留下点什么，留言板一直开着。',
]

export default async function BlogPage() {
  const [
    posts,
    pageTitle,
    pageDescription,
    cornerTitle,
    cornerContent,
    quickLinksTitle,
    quickLinkAboutLabel,
    quickLinkAboutHref,
    quickLinkGuestbookLabel,
    quickLinkGuestbookHref,
  ] = await Promise.all([
    getAllPosts(),
    getSetting('blog.homeTitle'),
    getSetting('blog.homeDescription'),
    getSetting('blog.cornerTitle'),
    getSetting('blog.cornerContent'),
    getSetting('blog.quickLinksTitle'),
    getSetting('blog.quickLinkAboutLabel'),
    getSetting('blog.quickLinkAboutHref'),
    getSetting('blog.quickLinkGuestbookLabel'),
    getSetting('blog.quickLinkGuestbookHref'),
  ])
  const parsedCornerLines = (cornerContent || '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)

  return (
    <BlogTheme>
      <BlogIndexPage
        posts={posts}
        title={pageTitle.trim() || '博客文章'}
        description={pageDescription.trim() || '写下生活、心情与一些正在发生的小事。'}
        cornerTitle={cornerTitle.trim() || '小站角落'}
        cornerLines={parsedCornerLines.length > 0 ? parsedCornerLines : DEFAULT_CORNER_LINES}
        quickLinksTitle={quickLinksTitle.trim() || '快速入口'}
        aboutLabel={quickLinkAboutLabel.trim() || '关于我'}
        aboutHref={quickLinkAboutHref.trim() || '/about'}
        guestbookLabel={quickLinkGuestbookLabel.trim() || '留言板'}
        guestbookHref={quickLinkGuestbookHref.trim() || '/guestbook'}
      />
    </BlogTheme>
  )
}
