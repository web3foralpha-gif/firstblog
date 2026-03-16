import { notFound } from 'next/navigation'
import { redirect } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import Header from '@/components/blog/Header'
import PikachuWidget from '@/components/blog/PikachuWidget'
import CommentSection from '@/components/blog/CommentSection'
import ArticleContent from '@/components/blog/ArticleContent'
import { getPostBySlug } from '@/lib/posts'
import { getLegacyArticleBySlug, getLegacyArticleTitleBySlug, hasLegacyArticleTokenAccess } from '@/lib/services/legacy-article-service'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ token?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const markdownPost = await getPostBySlug(slug)

  if (markdownPost) {
    return {
      title: markdownPost.title,
      description: markdownPost.description,
      alternates: {
        canonical: `/blog/${slug}`,
      },
    }
  }

  const article = await getLegacyArticleTitleBySlug(slug)
  return { title: article?.title || '文章', description: article?.excerpt || '历史文章内容' }
}

export default async function ArticlePage({ params, searchParams }: Props) {
  const [{ slug }, resolvedSearchParams] = await Promise.all([params, searchParams])
  const markdownPost = await getPostBySlug(slug)

  if (markdownPost) {
    redirect(`/blog/${slug}`)
  }

  const article = await getLegacyArticleBySlug(slug)

  if (!article) notFound()

  let tokenValid = false
  if (article.accessType === 'PAID' && resolvedSearchParams.token) {
    tokenValid = await hasLegacyArticleTokenAccess(article.id, resolvedSearchParams.token)
  }

  const comments = article.comments.map(c => ({
    ...c,
    email: c.email ?? undefined,
    createdAt: c.createdAt.toISOString(),
  }))

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <header className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">{article.mood}</span>
            {article.accessType === 'PASSWORD' && (
              <span className="badge badge-password">🔒 加密文章</span>
            )}
            {article.accessType === 'PAID' && (
              <span className="badge badge-paid">💰 打赏文章</span>
            )}
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-medium text-[#221e1a] leading-snug mb-3">
            {article.title}
          </h1>
          <time className="text-sm text-[#a89880]">{formatDate(article.createdAt)}</time>
        </header>

        <ArticleContent
          slug={slug}
          content={article.content}
          accessType={article.accessType as 'PUBLIC' | 'PASSWORD' | 'PAID'}
          price={article.price}
          title={article.title}
          tokenValid={tokenValid}
          passwordHint={article.passwordHint}
        />

        <CommentSection articleId={article.id} comments={comments} />
      </main>

      <footer className="border-t border-[#ddd5c8] mt-10 sm:mt-16 py-6 sm:py-8 text-center text-xs text-[#c4b8a7]">
        <p>用文字记录生活 · {new Date().getFullYear()}</p>
      </footer>
          <PikachuWidget />
    </div>
  )
}
