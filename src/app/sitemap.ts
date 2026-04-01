import type { MetadataRoute } from 'next'

import { getAllPosts } from '@/lib/posts'
import { absoluteUrl } from '@/lib/site'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllPosts()
  const latestPostDate = posts.length > 0
    ? new Date(posts[0].updatedAt || posts[0].publishedAt)
    : new Date()
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl('/'),
      lastModified: latestPostDate,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: absoluteUrl('/archive'),
      lastModified: latestPostDate,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: absoluteUrl('/about'),
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: absoluteUrl('/guestbook'),
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: absoluteUrl('/rss.xml'),
      lastModified: latestPostDate,
      changeFrequency: 'daily',
      priority: 0.5,
    },
  ]

  const postRoutes: MetadataRoute.Sitemap = posts.map(post => ({
    url: absoluteUrl(post.href || `/article/${post.slug}`),
    lastModified: new Date(post.updatedAt || post.publishedAt),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  return [...staticRoutes, ...postRoutes]
}
