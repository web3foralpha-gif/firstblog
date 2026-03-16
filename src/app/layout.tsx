import type { Metadata, Viewport } from 'next'
import './globals.css'
import 'quill/dist/quill.snow.css'
import 'highlight.js/styles/github-dark.css'
import { Providers } from '@/components/Providers'
import PageViewTracker from '@/components/PageViewTracker'
import { getSetting } from '@/lib/settings'
import { getSiteUrl } from '@/lib/site'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#faf8f5',
}

export async function generateMetadata(): Promise<Metadata> {
  const siteTitle = (await getSetting('site.title')).trim() || '我的小站'
  const siteDescription = (await getSetting('site.description')).trim() || '记录生活，分享心情'
  const siteUrl = getSiteUrl()

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: siteTitle,
      template: `%s | ${siteTitle}`,
    },
    description: siteDescription,
    alternates: {
      canonical: '/',
      types: {
        'application/rss+xml': '/rss.xml',
      },
    },
    openGraph: {
      type: 'website',
      title: siteTitle,
      description: siteDescription,
      url: siteUrl,
      siteName: siteTitle,
    },
    robots: {
      index: true,
      follow: true,
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
    },
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <Providers>
          <PageViewTracker />
          {children}
        </Providers>
      </body>
    </html>
  )
}
