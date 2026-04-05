import Link from 'next/link'

import AdminArticleWorkspaceFrame from '@/components/houtai/AdminArticleWorkspaceFrame'
import ArticleForm from '@/components/houtai/ArticleForm'

export const metadata = { title: '写新文章' }

export default function NewArticlePage() {
  return (
    <AdminArticleWorkspaceFrame
      title="写新文章"
      subtitle="把今天想记录的内容直接写进后台，封面、权限、海报和自动暂存都在同一个工作区里。"
      description="如果你只是想快速落笔，可以先写标题和正文；其他像封面、加密、付费、置顶，都可以在写完后再补。"
      stats={[
        { label: '当前模式', value: '新建文章', hint: '保存后会自动回到内容库。' },
        { label: '默认状态', value: '立即发布', hint: '下方可随时切成草稿。' },
        { label: '默认权限', value: '公开可见', hint: '也支持切到加密或付费。' },
        { label: '编辑保护', value: '自动暂存', hint: '未正式保存前，也会在当前浏览器临时保留。' },
      ]}
      links={[
        { href: '/houtai/articles', label: '返回文章库' },
        { href: '/houtai/media', label: '媒体库' },
        { href: '/houtai/settings?section=poster', label: '海报设置' },
      ]}
      actions={(
        <Link
          href="/houtai/articles"
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          返回文章库
        </Link>
      )}
    >
      <ArticleForm mode="new" />
    </AdminArticleWorkspaceFrame>
  )
}
