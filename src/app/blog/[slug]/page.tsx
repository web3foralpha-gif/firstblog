import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import Header from '@/components/blog/Header'
import MarkdownContent from '@/components/blog/MarkdownContent'
import PikachuWidget from '@/components/blog/PikachuWidget'
import { getAllPostSlugs, getPostBySlug } from '@/lib/posts'
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
  const post = await getPostBySlug(slug)

  if (!post) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <Header />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <header className="mb-10">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="text-2xl">{post.mood}</span>
            <span className="badge badge-public">Markdown</span>
            <span className="text-xs text-[#a89880]">{post.readingTimeMinutes} 分钟阅读</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-4xl font-medium text-[#221e1a] leading-snug mb-3">
            {post.title}
          </h1>
          <div className="flex items-center gap-3 flex-wrap text-sm text-[#a89880]">
            <time>{formatDate(post.publishedAt)}</time>
            {post.updatedAt && <span>更新于 {formatDate(post.updatedAt)}</span>}
          </div>
          {post.tags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap mt-4">
              {post.tags.map(tag => (
                <span key={tag} className="rounded-full bg-[#f0ebe3] px-3 py-1 text-xs text-[#5a4f42]">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </header>

        {post.coverImage && (
          <div className="mb-8 overflow-hidden rounded-3xl border border-[#eadfce] bg-white">
            <img
              src={post.coverImage}
              alt={post.title}
              className="block w-full h-auto"
              loading="eager"
            />
          </div>
        )}

        <MarkdownContent content={post.content} />

        <div className="mt-12 pt-6 border-t border-[#ddd5c8]">
          <a href="/blog" className="text-sm text-[#a89880] hover:text-[#d4711a] transition-colors">
            ← 返回博客列表
          </a>
        </div>
      </main>

      <footer className="border-t border-[#ddd5c8] mt-10 sm:mt-16 py-6 sm:py-8 text-center text-xs text-[#c4b8a7]">
        <p>用文字记录生活 · {new Date().getFullYear()}</p>
      </footer>

      <PikachuWidget />
    </div>
  )
}
