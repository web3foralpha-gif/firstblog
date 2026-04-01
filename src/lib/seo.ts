import 'server-only'

import { parseBlogLinks } from '@/lib/blog-ui'
import { absoluteUrl, getSiteUrl } from '@/lib/site'
import { getPublicSettings } from '@/lib/settings'

export type SiteSeoData = {
  siteName: string
  siteDescription: string
  siteUrl: string
  favicon?: string
  authorName: string
  authorDescription: string
  authorImage?: string
  coverImage?: string
  sameAs: string[]
}

type ListedItem = {
  title: string
  url: string
  description?: string
  publishedAt?: string
  updatedAt?: string
}

type ArticleSchemaInput = {
  path: string
  title: string
  description: string
  content?: string
  publishedAt: string
  updatedAt?: string
  image?: string
  tags?: string[]
  readingTimeMinutes?: number
  isAccessibleForFree?: boolean
}

function cleanText(value: string | null | undefined) {
  return (value ?? '').replace(/\s+/g, ' ').trim()
}

export function stripToPlainText(content: string) {
  return cleanText(
    content
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/<[^>]+>/g, ' ')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/^>\s?/gm, '')
      .replace(/[*_~|>-]/g, ' ')
      .replace(/\n+/g, ' '),
  )
}

export function summarizeText(content: string, maxLength = 160) {
  const plainText = stripToPlainText(content)
  if (plainText.length <= maxLength) return plainText
  return `${plainText.slice(0, Math.max(0, maxLength - 1)).trim()}…`
}

export function resolveAbsoluteAssetUrl(value: string | null | undefined) {
  const trimmed = value?.trim()
  if (!trimmed) return undefined
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (trimmed.startsWith('/')) return absoluteUrl(trimmed)
  return undefined
}

export function buildSeoImageCandidates(...values: Array<string | null | undefined>) {
  return [...new Set(values.map(resolveAbsoluteAssetUrl).filter((value): value is string => Boolean(value)))]
}

export async function getSiteSeoData(): Promise<SiteSeoData> {
  const settings = await getPublicSettings()
  const contacts = parseBlogLinks(settings['blog.aboutContacts'])

  return {
    siteName: cleanText(settings['site.title']) || '我的小站',
    siteDescription: cleanText(settings['site.description']) || '记录生活，分享心情',
    siteUrl: getSiteUrl(),
    favicon: cleanText(settings['site.favicon']) || undefined,
    authorName: cleanText(settings['blog.aboutTitle']) || cleanText(settings['site.title']) || '站长',
    authorDescription: cleanText(settings['blog.aboutSubtitle']) || cleanText(settings['site.description']) || '个人博客作者',
    authorImage: cleanText(settings['blog.aboutAvatar']) || undefined,
    coverImage: cleanText(settings['blog.aboutCoverImage']) || undefined,
    sameAs: contacts
      .map(link => link.href)
      .filter(href => /^https?:\/\//i.test(href)),
  }
}

export function buildOrganizationSchema(site: SiteSeoData) {
  const logo = buildSeoImageCandidates(site.favicon, site.authorImage, site.coverImage)[0]

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: site.siteName,
    url: site.siteUrl,
    description: site.siteDescription,
    logo: logo
      ? {
          '@type': 'ImageObject',
          url: logo,
        }
      : undefined,
    sameAs: site.sameAs.length > 0 ? site.sameAs : undefined,
  }
}

export function buildPersonSchema(site: SiteSeoData) {
  const image = buildSeoImageCandidates(site.authorImage, site.coverImage, site.favicon)[0]

  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: site.authorName,
    description: site.authorDescription,
    url: absoluteUrl('/about'),
    image,
    sameAs: site.sameAs.length > 0 ? site.sameAs : undefined,
  }
}

export function buildWebsiteSchema(site: SiteSeoData) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: site.siteName,
    description: site.siteDescription,
    url: site.siteUrl,
    inLanguage: 'zh-CN',
    publisher: {
      '@type': 'Organization',
      name: site.siteName,
      url: site.siteUrl,
    },
  }
}

export function buildProfilePageSchema(site: SiteSeoData, description: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    name: `${site.authorName} - 关于页`,
    description,
    url: absoluteUrl('/about'),
    inLanguage: 'zh-CN',
    mainEntity: {
      '@type': 'Person',
      name: site.authorName,
      description: description || site.authorDescription,
      url: absoluteUrl('/about'),
      image: buildSeoImageCandidates(site.authorImage, site.coverImage, site.favicon)[0],
      sameAs: site.sameAs.length > 0 ? site.sameAs : undefined,
    },
  }
}

export function buildCollectionPageSchema(
  site: SiteSeoData,
  {
    path,
    title,
    description,
    items,
  }: {
    path: string
    title: string
    description: string
    items?: ListedItem[]
  },
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description,
    url: absoluteUrl(path),
    inLanguage: 'zh-CN',
    isPartOf: {
      '@type': 'WebSite',
      name: site.siteName,
      url: site.siteUrl,
    },
    mainEntity: items && items.length > 0
      ? {
          '@type': 'ItemList',
          itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: item.url,
            name: item.title,
            description: item.description,
            datePublished: item.publishedAt,
            dateModified: item.updatedAt || item.publishedAt,
          })),
        }
      : undefined,
  }
}

export function buildBlogSchema(
  site: SiteSeoData,
  title: string,
  description: string,
  items: ListedItem[],
  path = '/',
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: title,
    description,
    url: absoluteUrl(path),
    inLanguage: 'zh-CN',
    publisher: {
      '@type': 'Organization',
      name: site.siteName,
      url: site.siteUrl,
    },
    author: {
      '@type': 'Person',
      name: site.authorName,
      url: absoluteUrl('/about'),
    },
    blogPost: items.map(item => ({
      '@type': 'BlogPosting',
      headline: item.title,
      url: item.url,
      description: item.description,
      datePublished: item.publishedAt,
      dateModified: item.updatedAt || item.publishedAt,
    })),
  }
}

export function buildArticleSchema(site: SiteSeoData, article: ArticleSchemaInput) {
  const plainText = article.content ? stripToPlainText(article.content) : ''
  const image = buildSeoImageCandidates(article.image, site.coverImage, site.authorImage, site.favicon)
  const tags = article.tags?.filter(Boolean) ?? []
  const accessible = article.isAccessibleForFree ?? true

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    description: article.description,
    url: absoluteUrl(article.path),
    mainEntityOfPage: absoluteUrl(article.path),
    image,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt || article.publishedAt,
    author: {
      '@type': 'Person',
      name: site.authorName,
      url: absoluteUrl('/about'),
    },
    publisher: {
      '@type': 'Organization',
      name: site.siteName,
      url: site.siteUrl,
      logo: buildSeoImageCandidates(site.favicon, site.authorImage, site.coverImage)[0]
        ? {
            '@type': 'ImageObject',
            url: buildSeoImageCandidates(site.favicon, site.authorImage, site.coverImage)[0],
          }
        : undefined,
    },
    inLanguage: 'zh-CN',
    isAccessibleForFree: accessible,
    hasPart: accessible
      ? undefined
      : {
          '@type': 'WebPageElement',
          isAccessibleForFree: false,
          cssSelector: '.article-paywall',
        },
    articleSection: tags[0] || '博客',
    keywords: tags.length > 0 ? tags.join(', ') : undefined,
    wordCount: plainText ? plainText.length : undefined,
    timeRequired: article.readingTimeMinutes ? `PT${article.readingTimeMinutes}M` : undefined,
  }
}

export function buildBreadcrumbSchema(items: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}
