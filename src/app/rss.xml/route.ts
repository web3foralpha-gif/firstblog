import { getAllPosts } from '@/lib/posts'
import { absoluteUrl, getSiteName, getSiteUrl } from '@/lib/site'

export const revalidate = 3600

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET() {
  const posts = await getAllPosts()
  const siteUrl = getSiteUrl()
  const siteName = getSiteName()

  const items = posts
    .map(
      post => `
        <item>
          <title>${escapeXml(post.title)}</title>
          <link>${absoluteUrl(post.href || `/article/${post.slug}`)}</link>
          <guid>${absoluteUrl(post.href || `/article/${post.slug}`)}</guid>
          <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
          <description>${escapeXml(post.description)}</description>
        </item>`,
    )
    .join('')

  const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(siteName)}</title>
    <link>${siteUrl}</link>
    <description>${escapeXml(`${siteName} 的博客订阅源`)}</description>
    ${items}
  </channel>
</rss>`

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
