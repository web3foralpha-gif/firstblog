import type { Metadata } from 'next'
import Link from 'next/link'

import BlogPageFrame from '@/components/blog/BlogPageFrame'
import InlineGuestbookForm from '@/components/blog/InlineGuestbookForm'
import StructuredData from '@/components/StructuredData'
import { getPublicGuestbookEmail } from '@/lib/guestbook'
import { buildCollectionPageSchema, buildSeoImageCandidates, getSiteSeoData } from '@/lib/seo'
import { getApprovedGuestbookMessages } from '@/lib/services/guestbook-service'
import { getGuestbookMetadataData, getGuestbookPageData } from '@/lib/services/site-service'
import { absoluteUrl } from '@/lib/site'
import { formatDate } from '@/lib/utils'

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
  const pinnedCount = messages.filter(message => message.pinned).length
  const publicEmailCount = messages.filter(message => Boolean(getPublicGuestbookEmail(message))).length
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
      <BlogPageFrame mainClassName="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <section className="theme-panel p-5 sm:p-7">
          <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_320px]">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-faint)]">Guestbook</p>
              <h1 className="mt-3 font-serif text-3xl font-medium leading-tight text-[var(--text-primary)] sm:text-4xl">
                {resolvedTitle}
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
                {guestbookPageData.pageSubtitle}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="theme-chip">
                  <span className="text-[var(--text-faint)]">公开留言</span>
                  <span className="font-medium text-[var(--text-primary)]">{messages.length} 条</span>
                </span>
                <span className="theme-chip">
                  <span className="text-[var(--text-faint)]">置顶留言</span>
                  <span className="font-medium text-[var(--text-primary)]">{pinnedCount} 条</span>
                </span>
                <span className="theme-chip">
                  <span className="text-[var(--text-faint)]">可联系</span>
                  <span className="font-medium text-[var(--text-primary)]">{publicEmailCount} 位</span>
                </span>
              </div>
            </div>

            <div className="theme-panel-soft p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-faint)]">留言前</p>
              <div className="mt-3 space-y-3 text-sm leading-6 text-[var(--text-secondary)]">
                <p>这里更像一块安静的留言墙，写一句经过，或者留一点情绪，都可以。</p>
                <p>公开显示前会先审核，邮箱默认不展示，除非你自己选择公开。</p>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <a href="#guestbook-form" className="rounded-full border border-[var(--border-color)] px-4 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]">
                  直接留言
                </a>
                <Link href="/archive" className="rounded-full border border-[var(--border-color)] px-4 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]">
                  先去看看文章
                </Link>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-8 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="theme-panel-soft p-4 sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-faint)]">Messages</p>
                <h2 className="mt-2 font-serif text-2xl font-medium text-[var(--text-primary)]">已经留下的话</h2>
              </div>
              <p className="text-sm text-[var(--text-subtle)]">按通过审核的顺序展示，置顶会放在更靠前的位置。</p>
            </div>

            {messages.length === 0 ? (
              <div className="py-16 text-center">
                <p className="mb-4 text-4xl">🌿</p>
                <p className="text-sm text-[var(--text-subtle)]">{guestbookPageData.emptyText}</p>
              </div>
            ) : (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {messages.map(message => {
                  const publicEmail = getPublicGuestbookEmail(message)

                  return (
                    <article key={message.id} className="rounded-[24px] border border-[var(--border-soft)] bg-white/70 p-5 shadow-[0_16px_40px_rgba(61,53,48,0.05)] transition-all hover:-translate-y-0.5 hover:border-[var(--accent)]">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="text-lg leading-none">{message.avatar}</span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-[var(--text-primary)]">{message.nickname}</p>
                            <time className="text-xs text-[var(--text-faint)]">{formatDate(message.createdAt)}</time>
                          </div>
                        </div>
                        {message.pinned ? <span className="badge badge-pinned">📌 置顶</span> : null}
                      </div>

                      <p className="mt-4 whitespace-pre-wrap font-serif text-[15px] leading-8 text-[var(--text-secondary)]">
                        {message.emoji ? <span className="mr-1">{message.emoji}</span> : null}
                        {message.content}
                      </p>

                      {publicEmail ? (
                        <a
                          href={`mailto:${publicEmail}`}
                          className="mt-4 inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface-muted-bg)] px-3 py-1.5 text-xs text-[var(--accent)] transition-colors hover:border-[var(--accent)]"
                        >
                          <span>✉</span>
                          <span className="truncate">{publicEmail}</span>
                        </a>
                      ) : null}
                    </article>
                  )
                })}
              </div>
            )}
          </section>

          <aside id="guestbook-form" className="xl:sticky xl:top-20">
            <InlineGuestbookForm copy={guestbookPageData.formCopy} />
          </aside>
        </div>
      </BlogPageFrame>
    </>
  )
}
