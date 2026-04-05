import type { Metadata } from 'next'

import BlogPageFrame from '@/components/blog/BlogPageFrame'
import MarkdownContent from '@/components/blog/MarkdownContent'
import StructuredData from '@/components/StructuredData'
import { parseBlogLinks } from '@/lib/blog-ui'
import { absoluteUrl } from '@/lib/site'
import { buildCollectionPageSchema, buildProfilePageSchema, buildSeoImageCandidates, getSiteSeoData, summarizeText } from '@/lib/seo'
import {
  getAboutPageData,
} from '@/lib/services/site-service'

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
      <BlogPageFrame compactFooter mainClassName="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-16" showMascot={false}>
          {aboutPageData.coverImage ? (
            <div className="mb-8 overflow-hidden rounded-[28px] border border-[var(--border-color)] bg-[var(--surface-soft)] shadow-[0_18px_48px_rgba(61,53,48,0.08)]">
              <img src={aboutPageData.coverImage} alt={aboutPageData.title} className="h-52 w-full object-cover sm:h-64" />
            </div>
          ) : null}

          <section className="mb-8 max-w-[38rem] rounded-[28px] border border-[var(--border-color)] bg-[var(--surface-soft)]/70 p-5 shadow-[0_18px_48px_rgba(61,53,48,0.06)] sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              {aboutPageData.avatar ? (
                <img
                  src={aboutPageData.avatar}
                  alt={aboutPageData.title}
                  className="h-24 w-24 rounded-full border border-[var(--border-color)] object-cover shadow-[0_10px_30px_rgba(61,53,48,0.12)] sm:h-28 sm:w-28"
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <h1 className="font-serif text-3xl font-medium text-[var(--text-primary)] sm:text-4xl">{aboutPageData.title}</h1>
                {aboutPageData.subtitle ? <p className="mt-3 text-sm leading-7 text-[var(--text-subtle)] sm:text-base">{aboutPageData.subtitle}</p> : null}
              </div>
            </div>
          </section>

          <MarkdownContent content={aboutPageData.content} className="article-body" />

          {contacts.length > 0 ? (
            <section className="mt-10 max-w-[26rem] rounded-[28px] border border-[var(--border-color)] bg-[var(--surface-soft)]/70 p-5 shadow-[0_18px_48px_rgba(61,53,48,0.06)] sm:p-6">
              <h2 className="font-serif text-2xl font-medium text-[var(--text-primary)]">{aboutPageData.contactsTitle}</h2>
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
      </BlogPageFrame>
    </>
  )
}
