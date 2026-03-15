'use client'
import { useState, useEffect, useCallback } from 'react'
import { PageHeader, Card, DataTable, Badge, Pagination, SearchInput, useToast, useConfirm, type ColDef } from '@/components/admin/ui'

interface Comment {
  id: string; nickname: string; email?: string; content: string
  status: string; createdAt: string; ipAddress?: string
  article: { title: string; slug: string }
}

const PAGE_SIZE = 20

export default function CommentsPage() {
  const toast = useToast()
  const { confirm, dialog } = useConfirm()
  const [rows, setRows]       = useState<Comment[]>([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [search, setSearch]   = useState('')
  const [status, setStatus]   = useState('ALL')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE), search, status })
    try {
      const res = await fetch(`/api/admin/comments?${params}`)
      const data = await res.json()
      setRows(data.comments ?? []); setTotal(data.total ?? 0)
    } finally { setLoading(false) }
  }, [page, search, status])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1); setSelected(new Set()) }, [search, status])

  async function action(id: string, act: string) {
    await fetch(`/api/admin/comments/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: act }) })
    toast(act === 'approve' ? '已通过' : act === 'reject' ? '已拒绝' : '已删除')
    load()
  }

  async function bulkAction(act: string) {
    if (selected.size === 0) return
    const label = act === 'approve' ? '通过' : '拒绝'
    const ok = await confirm(`批量${label}`, `确定要批量${label} ${selected.size} 条评论吗？`, { confirmLabel: `确认${label}`, danger: act === 'reject' })
    if (!ok) return
    await Promise.all(Array.from(selected).map(id =>
      fetch(`/api/admin/comments/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: act }) })
    ))
    toast(`已${label} ${selected.size} 条评论`)
    setSelected(new Set()); load()
  }

  function toggleAll() {
    if (selected.size === rows.length) setSelected(new Set())
    else setSelected(new Set(rows.map(r => r.id)))
  }

  const cols: ColDef<Comment>[] = [
    {
      key: 'check', label: '', width: '40px',
      render: r => (
        <input type="checkbox" checked={selected.has(r.id)}
          onChange={e => { const s = new Set(selected); e.target.checked ? s.add(r.id) : s.delete(r.id); setSelected(s) }}
          className="rounded border-slate-300" />
      ),
    },
    {
      key: 'user', label: '用户', width: '120px',
      render: r => (
        <div>
          <p className="font-medium text-slate-700 text-xs">{r.nickname}</p>
          {r.email && <p className="text-slate-400 text-xs truncate max-w-[110px]">{r.email}</p>}
          {r.ipAddress && <p className="text-slate-300 text-[10px]">{r.ipAddress}</p>}
        </div>
      ),
    },
    {
      key: 'content', label: '内容',
      render: r => <p className="text-sm text-slate-700 line-clamp-2 max-w-xs">{r.content}</p>,
    },
    {
      key: 'article', label: '文章', width: '140px',
      render: r => <p className="text-xs text-slate-500 truncate max-w-[130px]">{r.article?.title ?? '—'}</p>,
    },
    {
      key: 'createdAt', label: '时间', width: '90px',
      render: r => <span className="text-xs text-slate-400">{new Date(r.createdAt).toLocaleDateString('zh-CN')}</span>,
    },
    {
      key: 'status', label: '状态', width: '80px',
      render: r => <Badge status={r.status} />,
    },
    {
      key: 'actions', label: '操作', width: '140px',
      render: r => (
        <div className="flex gap-1.5">
          {r.status !== 'APPROVED'  && <button onClick={() => action(r.id, 'approve')} className="text-xs px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors">通过</button>}
          {r.status !== 'REJECTED'  && <button onClick={() => action(r.id, 'reject')}  className="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-colors">拒绝</button>}
          <button onClick={async () => { const ok = await confirm('删除评论', '确定删除这条评论吗？', { danger: true }); if (ok) action(r.id, 'delete') }}
            className="text-xs px-2 py-1 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200 transition-colors">删除</button>
        </div>
      ),
    },
  ]

  return (
    <div>
      {dialog}
      <PageHeader title="评论管理" subtitle={`共 ${total} 条`} />

      <Card>
        <div className="p-4 border-b border-slate-100 flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center">
            <SearchInput value={search} onChange={setSearch} placeholder="搜索内容、昵称…" />
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
              {[['ALL','全部'],['PENDING','待审核'],['APPROVED','已通过'],['REJECTED','已拒绝']].map(([v,l]) => (
                <button key={v} onClick={() => setStatus(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${status === v ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          {selected.size > 0 && (
            <div className="flex gap-2 items-center">
              <span className="text-xs text-slate-500">已选 {selected.size} 条</span>
              <button onClick={() => bulkAction('approve')} className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors">批量通过</button>
              <button onClick={() => bulkAction('reject')}  className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors">批量拒绝</button>
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <input type="checkbox" checked={rows.length > 0 && selected.size === rows.length}
              onChange={toggleAll} className="rounded border-slate-300" />
            <span className="text-xs text-slate-400">全选当前页</span>
          </div>
          <DataTable cols={cols} rows={rows} keyFn={r => r.id} loading={loading} empty="暂无评论" />
          <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
        </div>
      </Card>
    </div>
  )
}
