'use client'
import { useState, useEffect, useCallback } from 'react'
import { PageHeader, Card, DataTable, Badge, Pagination, SearchInput, useToast, useConfirm, type ColDef } from '@/components/houtai/ui'

interface Entry {
  id: string; nickname: string; avatar: string; email?: string; emailPublic: boolean; emailVisible: boolean
  content: string; status: string; createdAt: string; pinned: boolean
  ipAddress?: string; ipRegion?: string; ipCity?: string; ipIsp?: string
}
const PAGE_SIZE = 20

export default function GuestbookAdminPage() {
  const toast = useToast()
  const { confirm, dialog } = useConfirm()
  const [rows, setRows]     = useState<Entry[]>([])
  const [total, setTotal]   = useState(0)
  const [page, setPage]     = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('ALL')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE), search, status })
    try {
      const res = await fetch(`/api/houtai/guestbook?${params}`)
      const data = await res.json()
      setRows(data.entries ?? []); setTotal(data.total ?? 0)
    } finally { setLoading(false) }
  }, [page, search, status])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [search, status])

  async function act(id: string, action: string, label: string) {
    const res = await fetch(`/api/houtai/guestbook/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }),
    })
    if (res.ok) { toast(label); load() } else toast('操作失败', 'error')
  }

  const cols: ColDef<Entry>[] = [
    {
      key: 'user', label: '留言者', width: '140px',
      render: r => (
        <div>
          <p className="font-medium text-slate-700 text-sm">
            {r.avatar} {r.nickname} {r.pinned && <span className="text-amber-500">📌</span>}
          </p>
          {r.email && <p className="text-xs text-slate-400">{r.emailVisible ? r.email : '🔒 已隐藏'}</p>}
          {r.ipAddress && (
            <p className="text-[10px] text-slate-300">{r.ipRegion} {r.ipCity}</p>
          )}
        </div>
      ),
    },
    {
      key: 'content', label: '留言内容',
      render: r => <p className="text-sm text-slate-700 line-clamp-2 max-w-xs">{r.content}</p>,
    },
    {
      key: 'ip', label: 'IP 信息', width: '130px',
      render: r => r.ipAddress ? (
        <div className="text-xs">
          <p className="text-slate-500">{r.ipAddress}</p>
          <p className="text-slate-400">{r.ipIsp ?? ''}</p>
        </div>
      ) : <span className="text-slate-300">—</span>,
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
      key: 'actions', label: '操作', width: '220px',
      render: r => (
        <div className="flex gap-1.5 flex-wrap">
          {r.status !== 'APPROVED' && (
            <button onClick={() => act(r.id, 'approve', '已通过')}
              className="text-xs px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100">通过</button>
          )}
          {r.status !== 'REJECTED' && (
            <button onClick={() => act(r.id, 'reject', '已拒绝')}
              className="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100">拒绝</button>
          )}
          {r.email && (
            <button
              onClick={() => act(r.id, r.emailVisible ? 'hideEmail' : 'showEmail', r.emailVisible ? '邮箱已隐藏' : '邮箱已公开')}
              className="text-xs px-2 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
            >
              {r.emailVisible ? '隐藏邮箱' : '公开邮箱'}
            </button>
          )}
          <button
            onClick={() => act(r.id, r.pinned ? 'unpin' : 'pin', r.pinned ? '已取消置顶' : '留言已置顶')}
            className="text-xs px-2 py-1 rounded-lg bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100"
          >
            {r.pinned ? '取消置顶' : '置顶'}
          </button>
          <button onClick={async () => {
            const ok = await confirm('删除留言', '确定删除这条留言吗？', { danger: true })
            if (ok) act(r.id, 'delete', '已删除')
          }} className="text-xs px-2 py-1 rounded-lg bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100">删除</button>
        </div>
      ),
    },
  ]

  return (
    <div>
      {dialog}
      <PageHeader title="留言审核" subtitle={`共 ${total} 条`} />

      <Card>
        <div className="p-4 border-b border-slate-100 flex flex-wrap gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="搜索昵称、内容…" />
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            {[['ALL','全部'],['PENDING','待审核'],['APPROVED','已通过'],['REJECTED','已拒绝']].map(([v,l]) => (
              <button key={v} onClick={() => setStatus(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${status === v ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="p-4">
          <DataTable cols={cols} rows={rows} keyFn={r => r.id} loading={loading} empty="暂无留言" />
          <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
        </div>
      </Card>
    </div>
  )
}
