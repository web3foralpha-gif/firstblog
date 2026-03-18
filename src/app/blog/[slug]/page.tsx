import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import BlogTheme from '@/components/blog/BlogTheme'
import Header from '@/components/blog/Header'
import MarkdownContent from '@/components/blog/MarkdownContent'
import PikachuWidget from '@/components/blog/PikachuWidget'
import SiteFooter from '@/components/blog/SiteFooter'
import { getAllPostSlugs, getPostBySlug, syncMarkdownPostsToDatabase } from '@/lib/posts'
import { getLegacyArticleTitleBySlug } from '@/lib/services/legacy-article-service'
import { absoluteUrl } from '@/lib/site'
import { formatDate } from '@/lib/utils'

export const revalidate = 3600

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const slugs = await getAllPostSlugs()
  return slugs.map(slug => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  await syncMarkdownPostsToDatabase()

  const legacyArticle = await getLegacyArticleTitleBySlug(slug)
  if (legacyArticle) {
    return {
      title: legacyArticle.title,
      description: legacyArticle.excerpt || '文章详情',
      alternates: {
        canonical: `/article/${slug}`,
      },
    }
  }

  const post = await getPostBySlug(slug)

  if (!post) {
    return {
      title: '文章未找到',
    }
  }

  return {
    title: post.title,
    description: post.description,
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.description,
      url: absoluteUrl(`/blog/${post.slug}`),
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt || post.publishedAt,
      images: post.coverImage ? [{ url: absoluteUrl(post.coverImage) }] : undefined,
    },
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  await syncMarkdownPostsToDatabase()

  const legacyArticle = await getLegacyArticleTitleBySlug(slug)
  if (legacyArticle) {
    redirect(`/article/${slug}`)
  }

  const post = await getPostBySlug(slug)

  if (!post) {
    notFound()
  }

  return (
    <BlogTheme>
      <div className="min-h-screen">
        <Header />

        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
          <header className="mb-10">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-2xl">{post.mood}</span>
              <span className="badge badge-public">Markdown</span>
              <span className="text-xs text-[var(--text-subtle)]">{post.readingTimeMinutes} 分钟阅读</span>
            </div>
            <h1 className="mb-3 font-serif text-2xl font-medium leading-snug text-[var(--text-primary)] sm:text-4xl">
              {post.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-subtle)]">
              <time>{formatDate(post.publishedAt)}</time>
              {post.updatedAt && <span>更新于 {formatDate(post.updatedAt)}</span>}
            </div>
            {post.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {post.tags.map(tag => (
                  <span key={tag} className="rounded-full bg-[var(--surface-soft)] px-3 py-1 text-xs text-[var(--text-secondary)]">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </header>

          {post.coverImage && (
            <div className="mb-8 overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--surface-bg)]">
              <img
                src={post.coverImage}
                alt={post.title}
                className="block h-auto w-full"
                loading="eager"
              />
            </div>
          )}

          <MarkdownContent content={post.content} />

          <div className="mt-12 border-t border-[var(--border-color)] pt-6">
            <a href="/blog" className="text-sm text-[var(--text-subtle)] transition-colors hover:text-[var(--accent)]">
              ← 返回博客列表
            </a>
          </div>
        </main>

        <SiteFooter compact />

        <PikachuWidget />
      </div>
    </BlogTheme>
  )
}
