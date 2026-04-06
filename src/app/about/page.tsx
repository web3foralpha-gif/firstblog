import type { Metadata } from 'next'
import Link from 'next/link'

import BlogPageFrame from '@/components/blog/BlogPageFrame'
import MarkdownContent from '@/components/blog/MarkdownContent'
import StructuredData from '@/components/StructuredData'
import { parseBlogLinks } from '@/lib/blog-ui'
import { buildCollectionPageSchema, buildProfilePageSchema, buildSeoImageCandidates, getSiteSeoData, summarizeText } from '@/lib/seo'
import { getAboutPageData } from '@/lib/services/site-service'
import { absoluteUrl } from '@/lib/site'

export const revalidate = 3600

export async function generateMetadata(): Promise<Metadata> {
  const [site, aboutPageData] = await Promise.all([
    getSiteSeoData(),
    getAboutPageData(),
  ])
  const description = summarizeText(aboutPageData.subtitle || aboutPageData.content, 160) || site.siteDescription
  const images = buildSeoImageCandidates(aboutPageData.coverImage, aboutPageData.avatar, site.favicon)

  return {
    title: aboutPageData.title,
    description,
    alternates: {
      canonical: '/about',
    },
    openGraph: {
      type: 'profile',
      title: aboutPageData.title,
      description,
      url: absoluteUrl('/about'),
      siteName: site.siteName,
      locale: 'zh_CN',
      images: images.length > 0 ? images.map(url => ({ url })) : undefined,
    },
    twitter: {
      card: images.length > 0 ? 'summary_large_image' : 'summary',
      title: aboutPageData.title,
      description,
      images: images.length > 0 ? images : undefined,
    },
  }
}

export default async function AboutPage() {
  const [site, aboutPageData] = await Promise.all([
    getSiteSeoData(),
    getAboutPageData(),
  ])
  const contacts = parseBlogLinks(aboutPageData.contactsValue)
  const pageDescription = summarizeText(aboutPageData.subtitle || aboutPageData.content, 160) || site.siteDescription

  return (
    <>
      <StructuredData
        data={[
          buildProfilePageSchema(site, pageDescription),
          buildCollectionPageSchema(site, {
            path: '/about',
            title: aboutPageData.title,
            description: pageDescription,
            items: contacts.map(link => ({
              title: link.label,
              url: link.href.startsWith('http') ? link.href : absoluteUrl('/about'),
            })),
          }),
        ]}
      />
      <BlogPageFrame compactFooter mainClassName="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10" showMascot={false}>
        {aboutPageData.coverImage ? (
          <div className="mb-8 overflow-hidden rounded-[28px] border border-[var(--border-color)] bg-[var(--surface-soft)] shadow-[0_18px_48px_rgba(61,53,48,0.08)]">
            <img src={aboutPageData.coverImage} alt={aboutPageData.title} className="h-52 w-full object-cover sm:h-72" />
          </div>
        ) : null}

        <section className="theme-panel p-5 sm:p-7">
          <div className="relative grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center">
            {aboutPageData.avatar ? (
              <img
                src={aboutPageData.avatar}
                alt={aboutPageData.title}
                className="h-24 w-24 rounded-full border border-[var(--border-color)] object-cover shadow-[0_10px_30px_rgba(61,53,48,0.12)] sm:h-28 sm:w-28"
              />
            ) : null}

            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-faint)]">About</p>
              <h1 className="mt-3 font-serif text-3xl font-medium text-[var(--text-primary)] sm:text-4xl">{aboutPageData.title}</h1>
              {aboutPageData.subtitle ? (
                <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">{aboutPageData.subtitle}</p>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="theme-chip">
                  <span className="text-[var(--text-faint)]">站点</span>
                  <span className="font-medium text-[var(--text-primary)]">{site.siteName}</span>
                </span>
                <span className="theme-chip">
                  <span className="text-[var(--text-faint)]">联系入口</span>
                  <span className="font-medium text-[var(--text-primary)]">{contacts.length} 个</span>
                </span>
                <span className="theme-chip">
                  <span className="text-[var(--text-faint)]">状态</span>
                  <span className="font-medium text-[var(--text-primary)]">慢慢写，慢慢活</span>
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section className="theme-panel-soft p-5 sm:p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-faint)]">Profile</p>
            <div className="mt-4">
              <MarkdownContent content={aboutPageData.content} className="article-body" />
            </div>
          </section>

          <aside className="space-y-4 lg:sticky lg:top-20">
            <div className="theme-panel-soft p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-faint)]">小站说明</p>
              <div className="mt-3 space-y-3 text-sm leading-6 text-[var(--text-secondary)]">
                <p>这里不是展示墙，更像一个长期留下来的生活角落。</p>
                <p>会写情绪、生活、观察，也会写那些还没完全想明白的事。</p>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link href="/" className="rounded-full border border-[var(--border-color)] px-4 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]">
                  回首页
                </Link>
                <Link href="/archive" className="rounded-full border border-[var(--border-color)] px-4 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]">
                  去归档
                </Link>
              </div>
            </div>

            {contacts.length > 0 ? (
              <section className="theme-panel-soft p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-faint)]">Contact</p>
                <h2 className="mt-2 font-serif text-2xl font-medium text-[var(--text-primary)]">{aboutPageData.contactsTitle}</h2>
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
          </aside>
        </div>
      </BlogPageFrame>
    </>
  )
}
