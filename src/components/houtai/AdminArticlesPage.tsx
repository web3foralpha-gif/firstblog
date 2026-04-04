'use client'

import Link from 'next/link'
import { useMemo } from 'react'

import {
  Badge,
  Card,
  DataTable,
  PageHeader,
  Pagination,
  SearchInput,
  type ColDef,
} from '@/components/houtai/ui'
import {
  ADMIN_ARTICLES_PAGE_SIZE,
  type AdminArticleRow,
  useAdminArticlesPage,
} from '@/components/houtai/useAdminArticlesPage'

export default function AdminArticlesPage() {
  const {
    deleteArticle,
    dialog,
    filter,
    handleSort,
    loading,
    page,
    rows,
    search,
    setFilter,
    setPage,
    setSearch,
    sortDir,
    sortKey,
    togglePin,
    total,
  } = useAdminArticlesPage()

  const columns = useMemo<ColDef<AdminArticleRow>[]>(() => [
    {
      key: 'title',
      label: '标题',
      sortable: true,
      render: article => (
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex-shrink-0 text-base">{article.mood}</span>
          <div className="min-w-0">
            <p className="max-w-[280px] truncate font-medium text-slate-800">
              {article.pinned ? <span className="mr-1 text-amber-500">📌</span> : null}
              {article.title}
            </p>
            <p className="truncate text-xs text-slate-400">/article/{article.slug}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'accessType',
      label: '类型',
      width: '80px',
      render: article => <Badge status={article.accessType} />,
    },
    {
      key: 'published',
      label: '状态',
      width: '80px',
      render: article => (
        <Badge
          status={article.published ? 'APPROVED' : 'PENDING'}
          label={article.published ? '已发布' : '草稿'}
        />
      ),
    },
    {
      key: 'createdAt',
      label: '日期',
      sortable: true,
      width: '120px',
      render: article => (
        <span className="text-xs text-slate-500">
          {new Date(article.createdAt).toLocaleDateString('zh-CN')}
        </span>
      ),
    },
    {
      key: 'comments',
      label: '评论',
      width: '60px',
      render: article => <span className="text-slate-500">{article._count.comments}</span>,
    },
    {
      key: 'actions',
      label: '操作',
      width: '120px',
      render: article => (
        <div className="flex gap-2">
          <Link
            href={`/article/${article.slug}`}
            target="_blank"
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 transition-colors hover:bg-slate-50"
          >
            预览
          </Link>
          <Link
            href={`/houtai/articles/${article.id}/edit`}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 transition-colors hover:bg-slate-50"
          >
            编辑
          </Link>
          <button
            onClick={() => void togglePin(article.id, !article.pinned)}
            className="rounded-lg border border-amber-100 px-2.5 py-1.5 text-xs text-amber-600 transition-colors hover:bg-amber-50"
          >
            {article.pinned ? '取消置顶' : '置顶'}
          </button>
          <button
            onClick={() => void deleteArticle(article.id, article.title)}
            className="rounded-lg border border-red-100 px-2.5 py-1.5 text-xs text-red-500 transition-colors hover:bg-red-50"
          >
            删除
          </button>
        </div>
      ),
    },
  ], [deleteArticle, togglePin])

  return (
    <div>
      {dialog}

      <PageHeader
        title="文章管理"
        subtitle={`共 ${total} 篇`}
        action={(
          <Link
            href="/houtai/articles/new"
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
          >
            <span>＋</span> 写新文章
          </Link>
        )}
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          <SearchInput value={search} onChange={setSearch} placeholder="搜索标题、slug…" />
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
            {[['ALL', '全部'], ['PUBLIC', '公开'], ['PASSWORD', '加密'], ['PAID', '打赏']].map(([value, label]) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === value
                    ? 'bg-white text-slate-800 shadow'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">
          <DataTable
            cols={columns}
            rows={rows}
            keyFn={row => row.id}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            loading={loading}
            empty="还没有文章，快去写第一篇吧 ✍️"
          />
          <Pagination
            page={page}
            total={total}
            pageSize={ADMIN_ARTICLES_PAGE_SIZE}
            onChange={setPage}
          />
        </div>
      </Card>
    </div>
  )
}
