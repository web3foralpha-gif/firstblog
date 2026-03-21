import type { MetadataRoute } from 'next'

import { getSiteSeoData } from '@/lib/seo'

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const site = await getSiteSeoData()
  const iconUrl = site.favicon?.trim()

  return {
    name: site.siteName,
    short_name: site.siteName,
    description: site.siteDescription,
    start_url: '/blog',
    scope: '/',
    display: 'standalone',
    background_color: '#faf8f5',
    theme_color: '#faf8f5',
    lang: 'zh-CN',
    icons: iconUrl
      ? [
          {
            src: iconUrl,
            sizes: 'any',
          },
        ]
      : [],
  }
}
