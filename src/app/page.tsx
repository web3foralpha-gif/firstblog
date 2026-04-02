import type { Metadata } from 'next'

import BlogTheme from '@/components/blog/BlogTheme'
import BlogIndexPage from '@/components/blog/BlogIndexPage'
import StructuredData from '@/components/StructuredData'
import { filterPostsByQuery, getAllPosts } from '@/lib/posts'
import { absoluteUrl } from '@/lib/site'
import { buildBlogSchema, buildCollectionPageSchema, buildSeoImageCandidates, getSiteSeoData } from '@/lib/seo'
import { getSettings } from '@/lib/settings'
import { getHomePageData } from '@/lib/services/site-service'

export const revalidate = 3600

type HomePageProps = {
  searchParams?: Promise<{ q?: string }>
}

function resolveHomeTitle(siteName: string) {
  return `${siteName} | 记录生活小事、方言与人生感悟`
}

function resolveHomeDescription(rawDescription: string, fallback: string) {
  const cleanDescription = rawDescription.trim()
  if (!cleanDescription) {
    return fallback
  }
  return cleanDescription
}

export async function generateMetadata(): Promise<Metadata> {
  const [site, metadataSettings] = await Promise.all([
    getSiteSeoData(),
    getSettings(['blog.homeDescription', 'site.keywords'] as const),
  ])
  const title = resolveHomeTitle(site.siteName)
  const description = resolveHomeDescription(metadataSettings['blog.homeDescription'], site.siteDescription)
  const images = buildSeoImageCandidates(site.coverImage, site.authorImage, site.favicon)
  const keywords = metadataSettings['site.keywords']
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
      canonical: '/',
    },
    openGraph: {
      type: 'website',
      title,
      description,
      url: absoluteUrl('/'),
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

const DEFAULT_CORNER_LINES = [
  '适合慢慢读几篇文章，发一会儿呆。',
  '右边的向日葵会记得每一次浇水、施肥和晒太阳。',
  '如果想留下点什么，留言板一直开着。',
]

export default async function HomePage({ searchParams }: HomePageProps) {
  const [resolvedSearchParams, posts, site, homePageData] = await Promise.all([
    searchParams ?? Promise.resolve<{ q?: string }>({}),
    getAllPosts(),
    getSiteSeoData(),
    getHomePageData(),
  ])

  const searchQuery = resolvedSearchParams.q?.trim() || ''
  const filteredPosts = filterPostsByQuery(posts, searchQuery)
  const title = homePageData.homeTitle || site.siteName
  const description = searchQuery
    ? `这里整理了和“${searchQuery}”相关的公开文章、摘要与延伸阅读入口。`
    : resolveHomeDescription(homePageData.homeDescription, site.siteDescription)
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
          buildBlogSchema(site, title, description, listedPosts, '/'),
          buildCollectionPageSchema(site, {
            path: '/',
            title,
            description,
            items: listedPosts,
          }),
        ]}
      />
      <BlogIndexPage
        posts={filteredPosts}
        title={title}
        description={description}
        searchQuery={searchQuery}
        searchPlaceholder={homePageData.searchPlaceholder}
        searchButtonLabel={homePageData.searchButtonLabel}
        searchClearLabel={homePageData.searchClearLabel}
        resultsSummaryTemplate={homePageData.resultsSummaryTemplate}
        filteredResultsSummaryTemplate={homePageData.filteredResultsSummaryTemplate}
        emptyStateText={homePageData.emptyStateText}
        emptySearchText={homePageData.emptySearchText}
        cornerTitle={homePageData.cornerTitle}
        cornerLines={homePageData.cornerLines.length > 0 ? homePageData.cornerLines : DEFAULT_CORNER_LINES}
        showCornerCard={homePageData.showCornerCard}
        quickLinksTitle={homePageData.quickLinksTitle}
        showQuickLinksCard={homePageData.showQuickLinksCard}
        aboutLabel={homePageData.aboutLabel}
        aboutHref={homePageData.aboutHref}
        guestbookLabel={homePageData.guestbookLabel}
        guestbookHref={homePageData.guestbookHref}
        archiveLabel={homePageData.archiveLabel}
        showArchiveLink={homePageData.showArchiveLink}
        rssLabel={homePageData.rssLabel}
        showRssLink={homePageData.showRssLink}
      />
    </BlogTheme>
  )
}
