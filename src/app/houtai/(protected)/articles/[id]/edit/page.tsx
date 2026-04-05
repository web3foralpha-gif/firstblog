import Link from 'next/link'
import { notFound } from 'next/navigation'

import ArticleForm from '@/components/houtai/ArticleForm'
import AdminArticleWorkspaceFrame from '@/components/houtai/AdminArticleWorkspaceFrame'
import { prisma } from '@/lib/prisma'

export const metadata = { title: '编辑文章' }
export const dynamic = 'force-dynamic'

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const article = await prisma.article.findUnique({
    where: { id },
  })
  if (!article) notFound()

  return (
    <AdminArticleWorkspaceFrame
      title="编辑文章"
      subtitle={article.title}
      description="这里会保留原有内容、权限和封面设置。你可以直接修改正文，也可以顺手核对封面、海报与发布状态。"
      stats={[
        { label: '文章状态', value: article.published ? '已发布' : '草稿中', hint: article.published ? '前台访客当前可以看到它。' : '还没有对前台公开。' },
        { label: '访问权限', value: article.accessType === 'PASSWORD' ? '加密文章' : article.accessType === 'PAID' ? '付费文章' : '公开文章', hint: article.passwordHint ? `密码提示：${article.passwordHint}` : article.price ? `当前价格：¥${article.price}` : '当前没有额外访问门槛。' },
        { label: '封面状态', value: article.coverImage ? '已设置封面' : '暂无封面', hint: article.coverImage ? '右侧预览会同步体现封面效果。' : '如果是重点文章，建议补一张封面。' },
        { label: '更新时间', value: new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(article.updatedAt), hint: article.pinned ? '当前已置顶展示。' : '当前按正常排序展示。' },
      ]}
      links={[
        { href: '/houtai/articles', label: '返回文章库' },
        { href: `/article/${article.slug}`, label: '前台预览' },
        { href: '/houtai/settings?section=article', label: '文章页设置' },
      ]}
      actions={(
        <>
          <Link
            href={`/article/${article.slug}`}
            target="_blank"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            前台预览
          </Link>
          <Link
            href="/houtai/articles"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            返回文章库
          </Link>
        </>
      )}
    >
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
    </AdminArticleWorkspaceFrame>
  )
}
