import type { Metadata } from 'next'

import BlogTheme from '@/components/blog/BlogTheme'
import BlogIndexPage from '@/components/blog/BlogIndexPage'
import StructuredData from '@/components/StructuredData'
import { absoluteUrl } from '@/lib/site'
import { buildBlogSchema, buildCollectionPageSchema, buildSeoImageCandidates, getSiteSeoData } from '@/lib/seo'
import { getSetting } from '@/lib/settings'
import { filterPostsByQuery, getAllPosts } from '@/lib/posts'

const GENERIC_BLOG_TITLES = new Set(['博客', '博客文章', '最新文章'])
const GENERIC_BLOG_DESCRIPTIONS = new Set([
  '写下生活、心情与一些正在发生的小事。',
  '记录生活小事、方言与人生感悟，也写下正在发生的真实心情。',
])

function resolveBlogSeoTitle(rawTitle: string, siteName: string) {
  const cleanTitle = rawTitle.trim()
  if (!cleanTitle || GENERIC_BLOG_TITLES.has(cleanTitle)) {
    return `${siteName} | 记录生活小事、方言与人生感悟`
  }
  return cleanTitle
}

function resolveBlogSeoDescription(rawDescription: string) {
  const cleanDescription = rawDescription.trim()
  if (!cleanDescription || GENERIC_BLOG_DESCRIPTIONS.has(cleanDescription)) {
    return '一个记录日常、美食、方言文化和人生思考的个人博客，分享正在发生的小事与真实感悟。'
  }
  return cleanDescription
}

export async function generateMetadata(): Promise<Metadata> {
  const [titleSetting, descriptionSetting, keywordsSetting, site] = await Promise.all([
    getSetting('blog.homeTitle'),
    getSetting('blog.homeDescription'),
    getSetting('site.keywords'),
    getSiteSeoData(),
  ])
  const title = resolveBlogSeoTitle(titleSetting, site.siteName)
  const description = resolveBlogSeoDescription(descriptionSetting)
  const images = buildSeoImageCandidates(site.coverImage, site.authorImage, site.favicon)
  const keywords = keywordsSetting
    .split(',')
    .map(keyword => keyword.trim())
    .filter(Boolean)

  return {
    title: {
      absolute: title,
    },
    description,
    keywords: keywords.length > 0 ? keywords : undefined,
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

type BlogPageProps = {
  searchParams?: Promise<{ q?: string }>
}

const DEFAULT_CORNER_LINES = [
  '适合慢慢读几篇文章，发一会儿呆。',
  '右边的向日葵会记得每一次浇水、施肥和晒太阳。',
  '如果想留下点什么，留言板一直开着。',
]

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const [
    resolvedSearchParams,
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
    searchParams ?? Promise.resolve<{ q?: string }>({}),
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
  const searchQuery = resolvedSearchParams.q?.trim() || ''
  const parsedCornerLines = (cornerContent || '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
  const filteredPosts = filterPostsByQuery(posts, searchQuery)
  const resolvedTitle = searchQuery ? `与“${searchQuery}”相关的文章` : pageTitle.trim() || '最新文章'
  const resolvedDescription = searchQuery
    ? `这里整理了和“${searchQuery}”相关的公开文章、摘要与延伸阅读入口。`
    : resolveBlogSeoDescription(pageDescription)
  const listedPosts = filteredPosts.slice(0, 12).map(post => ({
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
        posts={filteredPosts}
        title={resolvedTitle}
        description={resolvedDescription}
        searchQuery={searchQuery}
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
