import type { Metadata } from 'next'

import BlogTheme from '@/components/blog/BlogTheme'
import BlogIndexPage from '@/components/blog/BlogIndexPage'
import StructuredData from '@/components/StructuredData'
import { absoluteUrl } from '@/lib/site'
import { buildBlogSchema, buildCollectionPageSchema, buildSeoImageCandidates, getSiteSeoData } from '@/lib/seo'
import { getSetting } from '@/lib/settings'
import { getAllPosts } from '@/lib/posts'

export async function generateMetadata(): Promise<Metadata> {
  const [titleSetting, descriptionSetting, site] = await Promise.all([
    getSetting('blog.homeTitle'),
    getSetting('blog.homeDescription'),
    getSiteSeoData(),
  ])
  const title = titleSetting.trim() || '博客'
  const description = descriptionSetting.trim() || '写下生活、心情与一些正在发生的小事。'
  const images = buildSeoImageCandidates(site.coverImage, site.authorImage, site.favicon)

  return {
    title,
    description,
    alternates: {
      canonical: '/blog',
    },
    openGraph: {
      type: 'website',
      title,
      description,
      url: absoluteUrl('/blog'),
      siteName: site.siteName,
      locale: 'zh_CN',
      images: images.length > 0 ? images.map(url => ({ url })) : undefined,
    },
    twitter: {
      card: images.length > 0 ? 'summary_large_image' : 'summary',
      title,
      description,
      images: images.length > 0 ? images : undefined,
    },
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
    site,
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
    getSiteSeoData(),
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
  const resolvedTitle = pageTitle.trim() || '博客文章'
  const resolvedDescription = pageDescription.trim() || '写下生活、心情与一些正在发生的小事。'
  const listedPosts = posts.slice(0, 12).map(post => ({
    title: post.title,
    url: absoluteUrl(post.href || `/article/${post.slug}`),
    description: post.description,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
  }))

  return (
    <BlogTheme>
      <StructuredData
        data={[
          buildBlogSchema(site, resolvedTitle, resolvedDescription, listedPosts),
          buildCollectionPageSchema(site, {
            path: '/blog',
            title: resolvedTitle,
            description: resolvedDescription,
            items: listedPosts,
          }),
        ]}
      />
      <BlogIndexPage
        posts={posts}
        title={resolvedTitle}
        description={resolvedDescription}
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
