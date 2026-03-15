import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import Header from '@/components/blog/Header'
import PikachuWidget from '@/components/blog/PikachuWidget'
import CommentSection from '@/components/blog/CommentSection'
import ArticleContent from '@/components/blog/ArticleContent'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

type Props = { params: { slug: string }; searchParams: { token?: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await prisma.article.findUnique({
    where: { slug: params.slug },
    select: { title: true },
  }).catch(() => null)
  return { title: article?.title || '文章' }
}

export default async function ArticlePage({ params, searchParams }: Props) {
  const article = await prisma.article.findUnique({
    where: { slug: params.slug, published: true },
    include: {
      comments: {
        where: { status: 'APPROVED' },
        orderBy: { createdAt: 'asc' },
        select: { id: true, nickname: true, email: true, content: true, createdAt: true },
      },
    },
  }).catch(() => null)

  if (!article) notFound()

  // 验证 token（打赏文章）
  let tokenValid = false
  if (article.accessType === 'PAID' && searchParams.token) {
    const payment = await prisma.payment.findFirst({
      where: {
        articleId: article.id,
        accessToken: searchParams.token,
        status: 'COMPLETED',
        OR: [{ tokenExpiresAt: null }, { tokenExpiresAt: { gt: new Date() } }],
      },
    }).catch(() => null)
    tokenValid = !!payment
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
        {/* 文章头部 */}
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

        {/* 文章内容（含访问控制逻辑） */}
        <ArticleContent
          slug={params.slug}
          content={article.content}
          accessType={article.accessType as 'PUBLIC' | 'PASSWORD' | 'PAID'}
          price={article.price}
          title={article.title}
          tokenValid={tokenValid}
          passwordHint={article.passwordHint}
        />

        {/* 评论区（所有已解锁文章均可评论） */}
        <CommentSection articleId={article.id} comments={comments} />
      </main>

      <footer className="border-t border-[#ddd5c8] mt-10 sm:mt-16 py-6 sm:py-8 text-center text-xs text-[#c4b8a7]">
        <p>用文字记录生活 · {new Date().getFullYear()}</p>
      </footer>
          <PikachuWidget />
    </div>
  )
}
