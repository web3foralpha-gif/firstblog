import BlogTheme from '@/components/blog/BlogTheme'
import Header from '@/components/blog/Header'
import MarkdownContent from '@/components/blog/MarkdownContent'
import SiteFooter from '@/components/blog/SiteFooter'
import { parseBlogLinks } from '@/lib/blog-ui'
import {
  getAboutPageAvatar,
  getAboutPageContacts,
  getAboutPageContactsTitle,
  getAboutPageContent,
  getAboutPageCoverImage,
  getAboutPageSubtitle,
  getAboutPageTitle,
} from '@/lib/services/site-service'

export const revalidate = 3600

export default async function AboutPage() {
  const [title, subtitle, avatar, coverImage, content, contactsTitle, contactsValue] = await Promise.all([
    getAboutPageTitle(),
    getAboutPageSubtitle(),
    getAboutPageAvatar(),
    getAboutPageCoverImage(),
    getAboutPageContent(),
    getAboutPageContactsTitle(),
    getAboutPageContacts(),
  ])
  const contacts = parseBlogLinks(contactsValue)

  return (
    <BlogTheme>
      <div className="min-h-screen">
        <Header />
        <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
          {coverImage ? (
            <div className="mb-8 overflow-hidden rounded-[28px] border border-[var(--border-color)] bg-[var(--surface-soft)] shadow-[0_18px_48px_rgba(61,53,48,0.08)]">
              <img src={coverImage} alt={title} className="h-52 w-full object-cover sm:h-64" />
            </div>
          ) : null}

          <section className="mb-8 max-w-[38rem] rounded-[28px] border border-[var(--border-color)] bg-[var(--surface-soft)]/70 p-5 shadow-[0_18px_48px_rgba(61,53,48,0.06)] sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              {avatar ? (
                <img
                  src={avatar}
                  alt={title}
                  className="h-24 w-24 rounded-full border border-[var(--border-color)] object-cover shadow-[0_10px_30px_rgba(61,53,48,0.12)] sm:h-28 sm:w-28"
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <h1 className="font-serif text-3xl font-medium text-[var(--text-primary)] sm:text-4xl">{title}</h1>
                {subtitle ? <p className="mt-3 text-sm leading-7 text-[var(--text-subtle)] sm:text-base">{subtitle}</p> : null}
              </div>
            </div>
          </section>

          <MarkdownContent content={content} />

          {contacts.length > 0 ? (
            <section className="mt-10 max-w-[26rem] rounded-[28px] border border-[var(--border-color)] bg-[var(--surface-soft)]/70 p-5 shadow-[0_18px_48px_rgba(61,53,48,0.06)] sm:p-6">
              <h2 className="font-serif text-2xl font-medium text-[var(--text-primary)]">{contactsTitle}</h2>
              <div className="mt-4 flex flex-wrap gap-3">
                {contacts.map(link => (
                  <a
                    key={`${link.label}-${link.href}`}
                    href={link.href}
                    target={link.href.startsWith('http') ? '_blank' : undefined}
                    rel={link.href.startsWith('http') ? 'noreferrer' : undefined}
                    className="inline-flex items-center rounded-full border border-[var(--border-color)] bg-white/80 px-4 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </section>
          ) : null}
        </main>
        <SiteFooter compact />
      </div>
    </BlogTheme>
  )
}
