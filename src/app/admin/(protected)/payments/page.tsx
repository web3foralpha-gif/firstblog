'use client'
import { useState, useEffect, useCallback } from 'react'
import { PageHeader, Card, DataTable, Badge, Pagination, SearchInput, type ColDef } from '@/components/admin/ui'

interface Payment {
  id: string; amount: number; currency: string; status: string
  createdAt: string; token?: string
  article?: { title: string }
}
const PAGE_SIZE = 20

export default function PaymentsPage() {
  const [rows, setRows]     = useState<Payment[]>([])
  const [total, setTotal]   = useState(0)
  const [page, setPage]     = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [revenue, setRevenue] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE), search })
    try {
      const res = await fetch(`/api/admin/payments?${params}`)
      const data = await res.json()
      setRows(data.payments ?? []); setTotal(data.total ?? 0); setRevenue(data.revenue ?? 0)
    } finally { setLoading(false) }
  }, [page, search])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [search])

  const cols: ColDef<Payment>[] = [
    { key: 'id', label: '订单号', width: '180px',
      render: r => <span className="font-mono text-xs text-slate-500 truncate block max-w-[170px]">{r.id}</span> },
    { key: 'article', label: '文章',
      render: r => <span className="text-sm text-slate-700 truncate block max-w-[200px]">{r.article?.title ?? '—'}</span> },
    { key: 'amount', label: '金额', width: '80px', sortable: true,
      render: r => <span className="font-medium text-slate-800">¥{(r.amount / 100).toFixed(2)}</span> },
    { key: 'status', label: '状态', width: '90px',
      render: r => <Badge status={r.status} /> },
    { key: 'createdAt', label: '时间', width: '110px', sortable: true,
      render: r => <span className="text-xs text-slate-400">{new Date(r.createdAt).toLocaleDateString('zh-CN')}</span> },
    { key: 'token', label: '令牌', width: '120px',
      render: r => r.token
        ? <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">{r.token}</span>
        : <span className="text-slate-300">—</span> },
  ]

  return (
    <div>
      <PageHeader title="打赏记录" subtitle={`累计收入 ¥${(revenue / 100).toFixed(2)}`} />

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {[
          { label: '总订单数', value: total },
          { label: '累计收入', value: `¥${(revenue / 100).toFixed(2)}` },
          { label: '本月收入', value: '—' },
        ].map(s => (
          <Card key={s.label} className="p-4">
            <p className="text-xs text-slate-500 mb-1">{s.label}</p>
            <p className="text-2xl font-semibold text-slate-800">{s.value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="p-4 border-b border-slate-100">
          <SearchInput value={search} onChange={setSearch} placeholder="搜索订单号…" />
        </div>
        <div className="p-4">
          <DataTable cols={cols} rows={rows} keyFn={r => r.id} loading={loading} empty="暂无打赏记录" />
          <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
        </div>
      </Card>
    </div>
  )
}
