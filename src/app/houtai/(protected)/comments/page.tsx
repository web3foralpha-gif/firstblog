'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

import AdminWorkspaceFrame from '@/components/houtai/AdminWorkspaceFrame'
import {
  Badge,
  Card,
  DataTable,
  Pagination,
  SearchInput,
  useConfirm,
  useToast,
  type ColDef,
} from '@/components/houtai/ui'

interface Comment {
  id: string
  nickname: string
  email?: string
  content: string
  status: string
  createdAt: string
  ipAddress?: string
  article: { title: string; slug: string }
}

const PAGE_SIZE = 20

export default function CommentsPage() {
  const toast = useToast()
  const { confirm, dialog } = useConfirm()
  const [rows, setRows] = useState<Comment[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('ALL')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE), search, status })
    try {
      const res = await fetch(`/api/houtai/comments?${params}`)
      const data = await res.json()
      setRows(data.comments ?? [])
      setTotal(data.total ?? 0)
    } finally {
      setLoading(false)
    }
  }, [page, search, status])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setPage(1)
    setSelected(new Set())
  }, [search, status])

  async function action(id: string, act: string) {
    await fetch(`/api/houtai/comments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: act }),
    })
    toast(act === 'approve' ? '已通过' : act === 'reject' ? '已拒绝' : '已删除')
    void load()
  }

  async function bulkAction(act: string) {
    if (selected.size === 0) return
    const label = act === 'approve' ? '通过' : '拒绝'
    const ok = await confirm(`批量${label}`, `确定要批量${label} ${selected.size} 条评论吗？`, {
      confirmLabel: `确认${label}`,
      danger: act === 'reject',
    })
    if (!ok) return
    await Promise.all(
      Array.from(selected).map(id =>
        fetch(`/api/houtai/comments/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: act }),
        }),
      ),
    )
    toast(`已${label} ${selected.size} 条评论`)
    setSelected(new Set())
    void load()
  }

  function toggleAll() {
    if (selected.size === rows.length) setSelected(new Set())
    else setSelected(new Set(rows.map(row => row.id)))
  }

  const pageStats = useMemo(() => {
    const pending = rows.filter(row => row.status === 'PENDING').length
    const approved = rows.filter(row => row.status === 'APPROVED').length
    const rejected = rows.filter(row => row.status === 'REJECTED').length
    const withEmail = rows.filter(row => Boolean(row.email)).length

    return [
      { label: '评论总量', value: `${total} 条`, hint: `当前页展示 ${rows.length} 条评论。` },
      { label: '待处理', value: `${pending} 条`, hint: `${approved} 条已通过，${rejected} 条已拒绝。` },
      { label: '已选中', value: `${selected.size} 条`, hint: selected.size > 0 ? '右侧可以直接批量处理。' : '需要时可先全选当前页。' },
      { label: '附带邮箱', value: `${withEmail} 条`, hint: '适合优先筛出值得认真回复的互动。' },
    ]
  }, [rows, selected.size, total])

  const statusLabels: Record<string, string> = {
    ALL: '全部评论',
    PENDING: '待审核评论',
    APPROVED: '已通过评论',
    REJECTED: '已拒绝评论',
  }

  const cols = useMemo<ColDef<Comment>[]>(() => [
    {
      key: 'check',
      label: '',
      width: '40px',
      render: row => (
        <input
          type="checkbox"
          checked={selected.has(row.id)}
          onChange={event => {
            const next = new Set(selected)
            if (event.target.checked) next.add(row.id)
            else next.delete(row.id)
            setSelected(next)
          }}
          className="rounded border-slate-300"
        />
      ),
    },
    {
      key: 'user',
      label: '留言者',
      width: '140px',
      render: row => (
        <div>
          <p className="text-xs font-medium text-slate-700">{row.nickname}</p>
          {row.email ? <p className="max-w-[120px] truncate text-xs text-slate-400">{row.email}</p> : null}
          {row.ipAddress ? <p className="text-[10px] text-slate-300">{row.ipAddress}</p> : null}
        </div>
      ),
    },
    {
      key: 'content',
      label: '内容',
      render: row => <p className="max-w-xs text-sm text-slate-700 line-clamp-2">{row.content}</p>,
    },
    {
      key: 'article',
      label: '文章',
      width: '160px',
      render: row => (
        <Link
          href={`/article/${row.article?.slug}`}
          target="_blank"
          className="block max-w-[150px] truncate text-xs text-slate-500 transition hover:text-slate-800"
        >
          {row.article?.title ?? '—'}
        </Link>
      ),
    },
    {
      key: 'createdAt',
      label: '时间',
      width: '90px',
      render: row => <span className="text-xs text-slate-400">{new Date(row.createdAt).toLocaleDateString('zh-CN')}</span>,
    },
    {
      key: 'status',
      label: '状态',
      width: '80px',
      render: row => <Badge status={row.status} />,
    },
    {
      key: 'actions',
      label: '操作',
      width: '160px',
      render: row => (
        <div className="flex flex-wrap gap-1.5">
          {row.status !== 'APPROVED' ? (
            <button
              onClick={() => void action(row.id, 'approve')}
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-700 transition-colors hover:bg-emerald-100"
            >
              通过
            </button>
          ) : null}
          {row.status !== 'REJECTED' ? (
            <button
              onClick={() => void action(row.id, 'reject')}
              className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-600 transition-colors hover:bg-red-100"
            >
              拒绝
            </button>
          ) : null}
          <button
            onClick={async () => {
              const ok = await confirm('删除评论', '确定删除这条评论吗？', { danger: true })
              if (ok) void action(row.id, 'delete')
            }}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-500 transition-colors hover:bg-slate-100"
          >
            删除
          </button>
        </div>
      ),
    },
  ], [confirm, selected, setSelected])

  return (
    <AdminWorkspaceFrame
      eyebrow="Moderation Queue"
      title="评论管理"
      subtitle="把评论审核、批量处理和文章上下文放在同一个工作区里。"
      description="这一层更适合做真正的审核工作：先看当前页的待处理量，再结合文章标题、访客信息和批量操作集中处理。"
      stats={pageStats}
      links={[
        { href: '/houtai/articles', label: '文章库' },
        { href: '/houtai/guestbook', label: '留言审核' },
        { href: '/houtai/analytics', label: '访问统计' },
      ]}
      actions={(
        <>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            刷新评论
          </button>
          {selected.size > 0 ? (
            <>
              <button
                type="button"
                onClick={() => void bulkAction('approve')}
                className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
              >
                批量通过
              </button>
              <button
                type="button"
                onClick={() => void bulkAction('reject')}
                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100"
              >
                批量拒绝
              </button>
            </>
          ) : null}
        </>
      )}
    >
      {dialog}

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          <SearchInput value={search} onChange={setSearch} placeholder="搜索内容、昵称…" />
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
            {[['ALL', '全部'], ['PENDING', '待审核'], ['APPROVED', '已通过'], ['REJECTED', '已拒绝']].map(([value, label]) => (
              <button
                key={value}
                onClick={() => setStatus(value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  status === value ? 'bg-white text-slate-800 shadow' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="ml-auto rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500">
            当前筛选：{statusLabels[status] ?? '全部评论'}
          </span>
        </div>

        <div className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <input
              type="checkbox"
              checked={rows.length > 0 && selected.size === rows.length}
              onChange={toggleAll}
              className="rounded border-slate-300"
            />
            <span className="text-xs text-slate-400">全选当前页</span>
          </div>
          <DataTable cols={cols} rows={rows} keyFn={row => row.id} loading={loading} empty="暂无评论" />
          <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
        </div>
      </Card>
    </AdminWorkspaceFrame>
  )
}
