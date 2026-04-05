import BlogPageFrame from '@/components/blog/BlogPageFrame'
import InlineGuestbookForm from '@/components/blog/InlineGuestbookForm'
import StructuredData from '@/components/StructuredData'
import { absoluteUrl } from '@/lib/site'
import { buildCollectionPageSchema, buildSeoImageCandidates, getSiteSeoData } from '@/lib/seo'
import { formatDate } from '@/lib/utils'
import { getPublicGuestbookEmail } from '@/lib/guestbook'
import { getApprovedGuestbookMessages } from '@/lib/services/guestbook-service'
import { getGuestbookMetadataData, getGuestbookPageData } from '@/lib/services/site-service'
import type { Metadata } from 'next'

export const revalidate = 300

export async function generateMetadata(): Promise<Metadata> {
  const [site, guestbookMetadata] = await Promise.all([
    getSiteSeoData(),
    getGuestbookMetadataData(),
  ])
  const { title, description } = guestbookMetadata
  const images = buildSeoImageCandidates(site.coverImage, site.authorImage, site.favicon)

  return {
    title,
    description,
    alternates: {
      canonical: '/guestbook',
    },
    openGraph: {
      type: 'website',
      title,
      description,
      url: absoluteUrl('/guestbook'),
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

export default async function GuestbookPage() {
  const [site, messages, guestbookPageData] = await Promise.all([
    getSiteSeoData(),
    getApprovedGuestbookMessages(),
    getGuestbookPageData(),
  ])
  const resolvedTitle = guestbookPageData.pageTitle
  const guestbookDescription = `访客留言板，当前共有 ${messages.length} 条公开留言。`

  return (
    <>
      <StructuredData
        data={buildCollectionPageSchema(site, {
          path: '/guestbook',
          title: resolvedTitle,
          description: guestbookDescription,
          items: messages.slice(0, 20).map(message => ({
            title: message.nickname,
            url: absoluteUrl('/guestbook'),
            description: message.content,
            publishedAt: message.createdAt.toISOString(),
          })),
        })}
      />
      <BlogPageFrame mainClassName="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12">
          <div className="mb-10 text-center">
            <h1 className="mb-3 font-serif text-3xl font-medium text-[var(--text-primary)]">{resolvedTitle}</h1>
            <p className="text-sm text-[var(--text-muted)]">{guestbookPageData.pageSubtitle}</p>
            <p className="mt-1 text-xs text-[var(--text-faint)]">共 {messages.length} 条留言</p>
          </div>

          <div className="mb-8 flex items-center gap-4">
            <hr className="flex-1 border-[var(--border-color)]" />
            <span className="text-xs text-[var(--text-faint)]">{guestbookPageData.messagesDividerLabel}</span>
            <hr className="flex-1 border-[var(--border-color)]" />
          </div>

          {messages.length === 0 ? (
            <div className="py-16 text-center">
              <p className="mb-4 text-4xl">🌿</p>
              <p className="text-sm text-[var(--text-subtle)]">{guestbookPageData.emptyText}</p>
            </div>
          ) : (
            <div className="columns-1 gap-4 space-y-4 sm:columns-2">
              {messages.map(msg => {
                const publicEmail = getPublicGuestbookEmail(msg)

                return (
                  <div key={msg.id} className="card mb-4 break-inside-avoid px-5 py-4">
                    {msg.pinned && (
                      <div className="mb-2">
                        <span className="badge badge-pinned">📌 置顶留言</span>
                      </div>
                    )}
                    <p className="mb-3 whitespace-pre-wrap font-serif text-[15px] leading-relaxed text-[var(--text-secondary)]">
                      {msg.emoji && <span className="mr-1">{msg.emoji}</span>}
                      {msg.content}
                    </p>
                    <div className="flex items-center gap-2 border-t border-[var(--border-soft)] pt-2">
                      <span className="text-lg leading-none">{msg.avatar}</span>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-medium text-[var(--text-subtle)]">{msg.nickname}</span>
                        {publicEmail && (
                          <a href={`mailto:${publicEmail}`} className="block truncate text-[11px] text-[var(--accent)] hover:underline">{publicEmail}</a>
                        )}
                      </div>
                      <time className="flex-shrink-0 text-xs text-[var(--text-faint)]">{formatDate(msg.createdAt)}</time>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="mb-8 mt-12 flex items-center gap-4">
            <hr className="flex-1 border-[var(--border-color)]" />
            <span className="text-xs text-[var(--text-faint)]">{guestbookPageData.formDividerLabel}</span>
            <hr className="flex-1 border-[var(--border-color)]" />
          </div>

          <InlineGuestbookForm copy={guestbookPageData.formCopy} />
      </BlogPageFrame>
    </>
  )
}
