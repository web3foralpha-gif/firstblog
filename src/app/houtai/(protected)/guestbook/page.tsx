'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import AdminWorkspaceFrame from '@/components/houtai/AdminWorkspaceFrame'
import { Badge, Card, DataTable, Pagination, SearchInput, useConfirm, useToast, type ColDef } from '@/components/houtai/ui'

interface Entry {
  id: string
  nickname: string
  avatar: string
  email?: string
  emailPublic: boolean
  emailVisible: boolean
  content: string
  status: string
  createdAt: string
  pinned: boolean
  ipAddress?: string
  ipRegion?: string
  ipCity?: string
  ipIsp?: string
}

const PAGE_SIZE = 20

export default function GuestbookAdminPage() {
  const toast = useToast()
  const { confirm, dialog } = useConfirm()
  const [rows, setRows] = useState<Entry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('ALL')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE), search, status })
    try {
      const res = await fetch(`/api/houtai/guestbook?${params}`)
      const data = await res.json()
      setRows(data.entries ?? [])
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
  }, [search, status])

  async function act(id: string, action: string, label: string) {
    const res = await fetch(`/api/houtai/guestbook/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    if (res.ok) {
      toast(label)
      void load()
    } else {
      toast('操作失败', 'error')
    }
  }

  const pageStats = useMemo(() => {
    const pending = rows.filter(row => row.status === 'PENDING').length
    const approved = rows.filter(row => row.status === 'APPROVED').length
    const pinned = rows.filter(row => row.pinned).length
    const visibleEmail = rows.filter(row => row.emailVisible && row.email).length

    return [
      { label: '留言总量', value: `${total} 条`, hint: `当前页展示 ${rows.length} 条留言。` },
      { label: '待处理', value: `${pending} 条`, hint: `${approved} 条已经公开展示。` },
      { label: '置顶中', value: `${pinned} 条`, hint: '置顶留言会优先显示在前台留言板。' },
      { label: '公开邮箱', value: `${visibleEmail} 条`, hint: '涉及隐私时建议再次确认是否要公开。' },
    ]
  }, [rows, total])

  const statusLabels: Record<string, string> = {
    ALL: '全部留言',
    PENDING: '待审核留言',
    APPROVED: '已通过留言',
    REJECTED: '已拒绝留言',
  }

  const cols = useMemo<ColDef<Entry>[]>(() => [
    {
      key: 'user',
      label: '留言者',
      width: '170px',
      render: row => (
        <div>
          <p className="text-sm font-medium text-slate-700">
            {row.avatar} {row.nickname} {row.pinned ? <span className="text-amber-500">📌</span> : null}
          </p>
          {row.email ? (
            <p className="text-xs text-slate-400">{row.emailVisible ? row.email : '🔒 已隐藏邮箱'}</p>
          ) : null}
          {row.ipAddress ? <p className="text-[10px] text-slate-300">{row.ipRegion} {row.ipCity}</p> : null}
        </div>
      ),
    },
    {
      key: 'content',
      label: '留言内容',
      render: row => <p className="max-w-sm text-sm text-slate-700 line-clamp-2">{row.content}</p>,
    },
    {
      key: 'ip',
      label: 'IP 信息',
      width: '150px',
      render: row => row.ipAddress ? (
        <div className="text-xs">
          <p className="text-slate-500">{row.ipAddress}</p>
          <p className="text-slate-400">{row.ipIsp ?? ''}</p>
        </div>
      ) : <span className="text-slate-300">—</span>,
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
      width: '240px',
      render: row => (
        <div className="flex flex-wrap gap-1.5">
          {row.status !== 'APPROVED' ? (
            <button
              onClick={() => void act(row.id, 'approve', '已通过')}
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-700 transition hover:bg-emerald-100"
            >
              通过
            </button>
          ) : null}
          {row.status !== 'REJECTED' ? (
            <button
              onClick={() => void act(row.id, 'reject', '已拒绝')}
              className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-600 transition hover:bg-red-100"
            >
              拒绝
            </button>
          ) : null}
          {row.email ? (
            <button
              onClick={() => void act(row.id, row.emailVisible ? 'hideEmail' : 'showEmail', row.emailVisible ? '邮箱已隐藏' : '邮箱已公开')}
              className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-700 transition hover:bg-amber-100"
            >
              {row.emailVisible ? '隐藏邮箱' : '公开邮箱'}
            </button>
          ) : null}
          <button
            onClick={() => void act(row.id, row.pinned ? 'unpin' : 'pin', row.pinned ? '已取消置顶' : '留言已置顶')}
            className="rounded-lg border border-yellow-200 bg-yellow-50 px-2 py-1 text-xs text-yellow-700 transition hover:bg-yellow-100"
          >
            {row.pinned ? '取消置顶' : '置顶'}
          </button>
          <button
            onClick={async () => {
              const ok = await confirm('删除留言', '确定删除这条留言吗？', { danger: true })
              if (ok) void act(row.id, 'delete', '已删除')
            }}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-500 transition hover:bg-slate-100"
          >
            删除
          </button>
        </div>
      ),
    },
  ], [confirm])

  return (
    <AdminWorkspaceFrame
      eyebrow="Guestbook Queue"
      title="留言审核"
      subtitle="前台留言、邮箱可见性和置顶状态都集中在这一层处理。"
      description="这里更偏向长期关系维护：除了审核本身，也要留意隐私显示、置顶顺序和哪些留言值得长期留在前台。"
      stats={pageStats}
      links={[
        { href: '/guestbook', label: '前台留言板' },
        { href: '/houtai/comments', label: '评论管理' },
        { href: '/houtai/analytics', label: '访问统计' },
      ]}
      actions={(
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          刷新留言
        </button>
      )}
    >
      {dialog}

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          <SearchInput value={search} onChange={setSearch} placeholder="搜索昵称、内容…" />
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
            当前筛选：{statusLabels[status] ?? '全部留言'}
          </span>
        </div>
        <div className="p-4">
          <DataTable cols={cols} rows={rows} keyFn={row => row.id} loading={loading} empty="暂无留言" />
          <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
        </div>
      </Card>
    </AdminWorkspaceFrame>
  )
}
