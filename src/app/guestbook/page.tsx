import BlogTheme from '@/components/blog/BlogTheme'
import Header from '@/components/blog/Header'
import PikachuWidget from '@/components/blog/PikachuWidget'
import InlineGuestbookForm from '@/components/blog/InlineGuestbookForm'
import SiteFooter from '@/components/blog/SiteFooter'
import StructuredData from '@/components/StructuredData'
import { absoluteUrl } from '@/lib/site'
import { buildCollectionPageSchema, buildSeoImageCandidates, getSiteSeoData } from '@/lib/seo'
import { getSetting } from '@/lib/settings'
import { formatDate } from '@/lib/utils'
import { getPublicGuestbookEmail } from '@/lib/guestbook'
import { getApprovedGuestbookMessages } from '@/lib/services/guestbook-service'
import type { Metadata } from 'next'

export const revalidate = 300

export async function generateMetadata(): Promise<Metadata> {
  const [site, titleSetting, descriptionSetting] = await Promise.all([
    getSiteSeoData(),
    getSetting('guestbook.pageTitle'),
    getSetting('guestbook.metaDescription'),
  ])
  const title = titleSetting.trim() || '留言板'
  const description = descriptionSetting.trim() || '访客可以在这里留下公开留言、足迹和问候。'
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
  const [site, messages, pageTitle, pageSubtitle, messagesDividerLabel, emptyText, formDividerLabel, formTitle, formSubtitle, nicknameLabel, nicknamePlaceholder, emailLabel, emailPlaceholder, emailPublicOnLabel, emailPublicOffLabel, emojiLabel, contentLabel, contentPlaceholder, submitLabel, submittingLabel, successTitle, successMessage, successActionLabel] = await Promise.all([
    getSiteSeoData(),
    getApprovedGuestbookMessages(),
    getSetting('guestbook.pageTitle'),
    getSetting('guestbook.pageSubtitle'),
    getSetting('guestbook.messagesDividerLabel'),
    getSetting('guestbook.emptyText'),
    getSetting('guestbook.formDividerLabel'),
    getSetting('guestbook.formTitle'),
    getSetting('guestbook.formSubtitle'),
    getSetting('guestbook.nicknameLabel'),
    getSetting('guestbook.nicknamePlaceholder'),
    getSetting('guestbook.emailLabel'),
    getSetting('guestbook.emailPlaceholder'),
    getSetting('guestbook.emailPublicOnLabel'),
    getSetting('guestbook.emailPublicOffLabel'),
    getSetting('guestbook.emojiLabel'),
    getSetting('guestbook.contentLabel'),
    getSetting('guestbook.contentPlaceholder'),
    getSetting('guestbook.submitLabel'),
    getSetting('guestbook.submittingLabel'),
    getSetting('guestbook.successTitle'),
    getSetting('guestbook.successMessage'),
    getSetting('guestbook.successActionLabel'),
  ])
  const resolvedTitle = pageTitle.trim() || '留言板'
  const guestbookDescription = `访客留言板，当前共有 ${messages.length} 条公开留言。`

  return (
    <BlogTheme>
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
      <div className="min-h-screen">
        <Header />

        <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12">
          <div className="mb-10 text-center">
            <h1 className="mb-3 font-serif text-3xl font-medium text-[var(--text-primary)]">{resolvedTitle}</h1>
            <p className="text-sm text-[var(--text-muted)]">{pageSubtitle.trim() || '大家留下的足迹，匿名、真实'}</p>
            <p className="mt-1 text-xs text-[var(--text-faint)]">共 {messages.length} 条留言</p>
          </div>

          <div className="mb-8 flex items-center gap-4">
            <hr className="flex-1 border-[var(--border-color)]" />
            <span className="text-xs text-[var(--text-faint)]">{messagesDividerLabel.trim() || '大家说的话'}</span>
            <hr className="flex-1 border-[var(--border-color)]" />
          </div>

          {messages.length === 0 ? (
            <div className="py-16 text-center">
              <p className="mb-4 text-4xl">🌿</p>
              <p className="text-sm text-[var(--text-subtle)]">{emptyText.trim() || '还没有留言，往下写下第一句话吧'}</p>
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
            <span className="text-xs text-[var(--text-faint)]">{formDividerLabel.trim() || '写下你的留言'}</span>
            <hr className="flex-1 border-[var(--border-color)]" />
          </div>

          <InlineGuestbookForm
            copy={{
              formTitle: formTitle.trim() || '写下你的留言',
              formSubtitle: formSubtitle.trim() || '审核通过后公开展示',
              nicknameLabel: nicknameLabel.trim() || '昵称 *',
              nicknamePlaceholder: nicknamePlaceholder.trim() || '你的名字',
              emailLabel: emailLabel.trim() || '邮箱（可选）',
              emailPlaceholder: emailPlaceholder.trim() || 'your@email.com',
              emailPublicOnLabel: emailPublicOnLabel.trim() || '公开邮箱（其他访客可见）',
              emailPublicOffLabel: emailPublicOffLabel.trim() || '不公开邮箱（仅博主可见）',
              emojiLabel: emojiLabel.trim() || '选个心情（可选）',
              contentLabel: contentLabel.trim() || '留言内容 *',
              contentPlaceholder: contentPlaceholder.trim() || '说点什么吧 ✍️',
              submitLabel: submitLabel.trim() || '发布留言 ✨',
              submittingLabel: submittingLabel.trim() || '提交中…',
              successTitle: successTitle.trim() || '留言已收到！',
              successMessage: successMessage.trim() || '留言已提交，审核后会展示在留言板',
              successActionLabel: successActionLabel.trim() || '再写一条',
            }}
          />
        </main>

        <SiteFooter />

        <PikachuWidget />
      </div>
    </BlogTheme>
  )
}
