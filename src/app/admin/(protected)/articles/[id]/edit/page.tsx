import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import ArticleForm from '@/components/admin/ArticleForm'

export const metadata = { title: '编辑文章' }
export const dynamic = 'force-dynamic'

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const article = await prisma.article.findUnique({
    where: { id },
  })
  if (!article) notFound()

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-2xl font-medium text-[#221e1a]">编辑文章</h1>
        <p className="text-sm text-[#a89880] mt-1 truncate">{article.title}</p>
      </div>
      <ArticleForm
        mode="edit"
        articleId={article.id}
        defaultValues={{
          title: article.title,
          content: article.content,
          mood: article.mood,
          coverImage: article.coverImage,
          accessType: article.accessType as 'PUBLIC' | 'PASSWORD' | 'PAID',
          price: article.price,
          passwordHint: article.passwordHint,
          pinned: article.pinned,
          published: article.published,
        }}
      />
    </div>
  )
}
