'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { PageHeader, Card, DataTable, Badge, Pagination, SearchInput, useToast, useConfirm, type ColDef } from '@/components/houtai/ui'

interface Article {
  id: string; slug: string; title: string; mood: string
  accessType: string; createdAt: string; _count: { comments: number }
  published: boolean
  pinned: boolean
}

const PAGE_SIZE = 15

export default function ArticlesPage() {
  const toast   = useToast()
  const { confirm, dialog } = useConfirm()

  const [rows,    setRows]    = useState<Article[]>([])
  const [total,   setTotal]   = useState(0)
  const [page,    setPage]    = useState(1)
  const [search,  setSearch]  = useState('')
  const [filter,  setFilter]  = useState('ALL')   // ALL | PUBLIC | PASSWORD | PAID
  const [sortKey, setSortKey] = useState('createdAt')
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(page), pageSize: String(PAGE_SIZE),
      search, filter, sortKey, sortDir,
    })
    try {
      const res = await fetch(`/api/houtai/articles?${params}`)
      const data = await res.json()
      setRows(data.articles ?? [])
      setTotal(data.total ?? 0)
    } finally { setLoading(false) }
  }, [page, search, filter, sortKey, sortDir])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [search, filter])

  function handleSort(key: string) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  async function deleteArticle(id: string, title: string) {
    const ok = await confirm('删除文章', `确定要删除《${title}》吗？此操作不可撤销。`, { danger: true, confirmLabel: '确认删除' })
    if (!ok) return
    const res = await fetch(`/api/houtai/articles/${id}`, { method: 'DELETE' })
    if (res.ok) { toast('文章已删除'); load() }
    else toast('删除失败', 'error')
  }

  async function togglePin(id: string, pinned: boolean) {
    const res = await fetch(`/api/houtai/articles/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned }),
    })

    if (res.ok) {
      toast(pinned ? '文章已置顶' : '文章已取消置顶')
      load()
    } else {
      toast('置顶操作失败', 'error')
    }
  }

  const cols: ColDef<Article>[] = [
    {
      key: 'title', label: '标题', sortable: true,
      render: a => (
          <div className="flex items-center gap-2 min-w-0">
          <span className="text-base flex-shrink-0">{a.mood}</span>
          <div className="min-w-0">
            <p className="font-medium text-slate-800 truncate max-w-[280px]">
              {a.pinned && <span className="mr-1 text-amber-500">📌</span>}
              {a.title}
            </p>
            <p className="text-xs text-slate-400 truncate">/article/{a.slug}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'accessType', label: '类型', width: '80px',
      render: a => <Badge status={a.accessType} />,
    },
    {
      key: 'published', label: '状态', width: '80px',
      render: a => <Badge status={a.published ? 'APPROVED' : 'PENDING'} label={a.published ? '已发布' : '草稿'} />,
    },
    {
      key: 'createdAt', label: '日期', sortable: true, width: '120px',
      render: a => <span className="text-slate-500 text-xs">{new Date(a.createdAt).toLocaleDateString('zh-CN')}</span>,
    },
    {
      key: 'comments', label: '评论', width: '60px',
      render: a => <span className="text-slate-500">{a._count.comments}</span>,
    },
    {
      key: 'actions', label: '操作', width: '120px',
      render: a => (
        <div className="flex gap-2">
          <Link href={`/article/${a.slug}`} target="_blank"
            className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
            预览
          </Link>
          <Link href={`/houtai/articles/${a.id}/edit`}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
            编辑
          </Link>
          <button onClick={() => togglePin(a.id, !a.pinned)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-amber-100 text-amber-600 hover:bg-amber-50 transition-colors">
            {a.pinned ? '取消置顶' : '置顶'}
          </button>
          <button onClick={() => deleteArticle(a.id, a.title)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-red-100 text-red-500 hover:bg-red-50 transition-colors">
            删除
          </button>
        </div>
      ),
    },
  ]

  return (
    <div>
      {dialog}
      <PageHeader title="文章管理" subtitle={`共 ${total} 篇`}
        action={
          <Link href="/houtai/articles/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 text-white text-sm font-medium hover:bg-slate-700 transition-colors">
            <span>＋</span> 写新文章
          </Link>
        }
      />

      <Card>
        {/* 筛选栏 */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap gap-3 items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="搜索标题、slug…" />
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            {[['ALL','全部'],['PUBLIC','公开'],['PASSWORD','加密'],['PAID','打赏']].map(([v,l]) => (
              <button key={v} onClick={() => setFilter(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === v ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* 表格 */}
        <div className="p-4">
          <DataTable cols={cols} rows={rows} keyFn={r => r.id}
            sortKey={sortKey} sortDir={sortDir} onSort={handleSort}
            loading={loading} empty="还没有文章，快去写第一篇吧 ✍️"
          />
          <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
        </div>
      </Card>
    </div>
  )
}
