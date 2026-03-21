import type { Metadata, Viewport } from 'next'
import './globals.css'
import 'quill/dist/quill.snow.css'
import 'highlight.js/styles/github-dark.css'
import { Providers } from '@/components/Providers'
import StructuredData from '@/components/StructuredData'
import PageViewTracker from '@/components/PageViewTracker'
import { absoluteUrl } from '@/lib/site'
import { buildOrganizationSchema, buildPersonSchema, buildSeoImageCandidates, buildWebsiteSchema, getSiteSeoData } from '@/lib/seo'
import { getAllSettings, getPublicSettings } from '@/lib/settings'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#faf8f5',
}

export async function generateMetadata(): Promise<Metadata> {
  const [site, publicSettings, settings] = await Promise.all([
    getSiteSeoData(),
    getPublicSettings(),
    getAllSettings(),
  ])
  const defaultImages = buildSeoImageCandidates(site.coverImage, site.authorImage, site.favicon).map(url => ({ url }))
  const iconUrl = site.favicon?.trim()
  const rawKeywords = publicSettings['site.keywords'] ?? ''
  const keywords = rawKeywords
    .split(',')
    .map(keyword => keyword.trim())
    .filter(Boolean)
  const googleVerification = settings['site.googleVerification']?.trim()
  const bingVerification = settings['site.bingVerification']?.trim()
  const baiduVerification = settings['site.baiduVerification']?.trim()
  const yandexVerification = settings['site.yandexVerification']?.trim()

  return {
    metadataBase: new URL(site.siteUrl),
    title: {
      default: site.siteName,
      template: `%s | ${site.siteName}`,
    },
    applicationName: site.siteName,
    description: site.siteDescription,
    keywords: keywords.length > 0 ? keywords : undefined,
    authors: [
      {
        name: site.authorName,
        url: absoluteUrl('/about'),
      },
    ],
    creator: site.authorName,
    publisher: site.siteName,
    referrer: 'origin-when-cross-origin',
    alternates: {
      types: {
        'application/rss+xml': '/rss.xml',
      },
    },
    openGraph: {
      type: 'website',
      title: site.siteName,
      description: site.siteDescription,
      url: site.siteUrl,
      siteName: site.siteName,
      locale: 'zh_CN',
      images: defaultImages.length > 0 ? defaultImages : undefined,
    },
    twitter: {
      card: defaultImages.length > 0 ? 'summary_large_image' : 'summary',
      title: site.siteName,
      description: site.siteDescription,
      images: defaultImages.length > 0 ? defaultImages.map(image => image.url) : undefined,
    },
    verification: {
      google: googleVerification || undefined,
      yandex: yandexVerification || undefined,
      other: {
        ...(bingVerification ? { 'msvalidate.01': bingVerification } : {}),
        ...(baiduVerification ? { 'baidu-site-verification': baiduVerification } : {}),
      },
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
    },
    icons: iconUrl ? {
      icon: [{ url: iconUrl }],
      shortcut: [{ url: iconUrl }],
      apple: [{ url: iconUrl }],
    } : undefined,
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const site = await getSiteSeoData()

  return (
    <html lang="zh-CN">
      <body>
        <StructuredData
          data={[
            buildWebsiteSchema(site),
            buildOrganizationSchema(site),
            buildPersonSchema(site),
          ]}
        />
        <Providers>
          <PageViewTracker />
          {children}
        </Providers>
      </body>
    </html>
  )
}
