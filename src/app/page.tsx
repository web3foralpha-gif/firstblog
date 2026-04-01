import type { Metadata } from 'next'

import BlogTheme from '@/components/blog/BlogTheme'
import BlogIndexPage from '@/components/blog/BlogIndexPage'
import StructuredData from '@/components/StructuredData'
import { filterPostsByQuery, getAllPosts } from '@/lib/posts'
import { absoluteUrl } from '@/lib/site'
import { buildBlogSchema, buildCollectionPageSchema, buildSeoImageCandidates, getSiteSeoData } from '@/lib/seo'
import { getSetting } from '@/lib/settings'

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
  const [site, pageDescription, keywordsSetting] = await Promise.all([
    getSiteSeoData(),
    getSetting('blog.homeDescription'),
    getSetting('site.keywords'),
  ])
  const title = resolveHomeTitle(site.siteName)
  const description = resolveHomeDescription(pageDescription, site.siteDescription)
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
  const [
    resolvedSearchParams,
    posts,
    site,
    homeTitle,
    pageDescription,
    searchPlaceholder,
    searchButtonLabel,
    searchClearLabel,
    emptyStateText,
    emptySearchText,
    showCornerCard,
    cornerTitle,
    cornerContent,
    showQuickLinksCard,
    quickLinksTitle,
    quickLinkAboutLabel,
    quickLinkAboutHref,
    quickLinkGuestbookLabel,
    quickLinkGuestbookHref,
    archiveLabel,
    rssLabel,
    showArchive,
    showRss,
  ] = await Promise.all([
    searchParams ?? Promise.resolve<{ q?: string }>({}),
    getAllPosts(),
    getSiteSeoData(),
    getSetting('blog.homeTitle'),
    getSetting('blog.homeDescription'),
    getSetting('blog.searchPlaceholder'),
    getSetting('blog.searchButtonLabel'),
    getSetting('blog.searchClearLabel'),
    getSetting('blog.emptyStateText'),
    getSetting('blog.emptySearchText'),
    getSetting('blog.showCornerCard'),
    getSetting('blog.cornerTitle'),
    getSetting('blog.cornerContent'),
    getSetting('blog.showQuickLinksCard'),
    getSetting('blog.quickLinksTitle'),
    getSetting('blog.quickLinkAboutLabel'),
    getSetting('blog.quickLinkAboutHref'),
    getSetting('blog.quickLinkGuestbookLabel'),
    getSetting('blog.quickLinkGuestbookHref'),
    getSetting('nav.archiveLabel'),
    getSetting('nav.rssLabel'),
    getSetting('nav.showArchive'),
    getSetting('nav.showRss'),
  ])

  const searchQuery = resolvedSearchParams.q?.trim() || ''
  const parsedCornerLines = (cornerContent || '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
  const filteredPosts = filterPostsByQuery(posts, searchQuery)
  const title = homeTitle.trim() || site.siteName
  const description = searchQuery
    ? `这里整理了和“${searchQuery}”相关的公开文章、摘要与延伸阅读入口。`
    : resolveHomeDescription(pageDescription, site.siteDescription)
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
        searchPlaceholder={searchPlaceholder.trim() || '搜标题、摘要、关键词…'}
        searchButtonLabel={searchButtonLabel.trim() || '搜索'}
        searchClearLabel={searchClearLabel.trim() || '清除'}
        emptyStateText={emptyStateText.trim() || '还没有公开文章，过几天再来看看吧。'}
        emptySearchText={emptySearchText.trim() || '暂时没有匹配这组关键词的文章。'}
        cornerTitle={cornerTitle.trim() || '小站角落'}
        cornerLines={parsedCornerLines.length > 0 ? parsedCornerLines : DEFAULT_CORNER_LINES}
        showCornerCard={showCornerCard === 'true'}
        quickLinksTitle={quickLinksTitle.trim() || '快速入口'}
        showQuickLinksCard={showQuickLinksCard === 'true'}
        aboutLabel={quickLinkAboutLabel.trim()}
        aboutHref={quickLinkAboutHref.trim()}
        guestbookLabel={quickLinkGuestbookLabel.trim()}
        guestbookHref={quickLinkGuestbookHref.trim()}
        archiveLabel={archiveLabel.trim() || '归档'}
        showArchiveLink={showArchive === 'true'}
        rssLabel={rssLabel.trim() || 'RSS'}
        showRssLink={showRss === 'true'}
      />
    </BlogTheme>
  )
}
