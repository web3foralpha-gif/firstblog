'use client'
import { useState, useEffect, useCallback } from 'react'
import FileUploader from '@/components/houtai/FileUploader'

type MediaItem = {
  id: string
  originalName: string
  url: string
  type: 'IMAGE' | 'VIDEO'
  size: number
  createdAt: string
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function MediaLibraryPage() {
  const [items, setItems] = useState<MediaItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filter, setFilter] = useState<'ALL' | 'IMAGE' | 'VIDEO'>('ALL')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const fetchMedia = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (filter !== 'ALL') params.set('type', filter)
    const res = await fetch(`/api/houtai/media?${params}`)
    const data = await res.json()
    setItems(data.items)
    setTotal(data.total)
    setTotalPages(data.totalPages)
    setLoading(false)
  }, [page, filter])

  useEffect(() => { fetchMedia() }, [fetchMedia])

  async function deleteItem(id: string, name: string) {
    if (!confirm(`确定删除「${name}」？已插入文章的链接将失效。`)) return
    await fetch('/api/houtai/media', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    fetchMedia()
    if (selected === id) setSelected(null)
  }

  function copyUrl(url: string, id: string) {
    navigator.clipboard.writeText(url)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl font-medium text-[#221e1a]">媒体库</h1>
          <p className="text-sm text-[#a89880] mt-1">共 {total} 个文件</p>
        </div>
      </div>

      {/* 上传区域 */}
      <div className="card p-5 mb-6">
        <p className="text-sm font-medium text-[#3d3530] mb-3">上传新文件</p>
        <FileUploader
          accept="both"
          onSuccess={() => { setPage(1); fetchMedia() }}
        />
      </div>

      {/* 筛选 */}
      <div className="flex gap-2 mb-4">
        {(['ALL', 'IMAGE', 'VIDEO'] as const).map(f => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(1) }}
            className={`px-4 py-1.5 rounded-lg text-sm border transition-all ${
              filter === f
                ? 'bg-[#fdf6ee] border-[#d4711a] text-[#d4711a]'
                : 'border-[#ddd5c8] text-[#5a4f42] hover:border-[#d4711a]'
            }`}
          >
            {f === 'ALL' ? '全部' : f === 'IMAGE' ? '🖼 图片' : '🎬 视频'}
          </button>
        ))}
      </div>

      {/* 网格 */}
      {loading ? (
        <div className="text-center py-16 text-[#a89880] text-sm">加载中…</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-[#a89880] text-sm">还没有文件</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {items.map(item => (
            <div
              key={item.id}
              onClick={() => setSelected(selected === item.id ? null : item.id)}
              className={`group relative cursor-pointer rounded-lg overflow-hidden border transition-all ${
                selected === item.id ? 'border-[#d4711a] ring-2 ring-[#d4711a]/20' : 'border-[#ddd5c8] hover:border-[#d4711a]'
              }`}
            >
              {/* 预览 */}
              <div className="aspect-square bg-[#f0ebe3] flex items-center justify-center">
                {item.type === 'IMAGE' ? (
                  <img src={item.url} alt={item.originalName} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-2">
                    <div className="text-3xl">🎬</div>
                    <p className="text-xs text-[#8c7d68] mt-1 truncate px-1">{item.originalName}</p>
                  </div>
                )}
              </div>

              {/* 悬浮操作 */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                <button
                  onClick={e => { e.stopPropagation(); copyUrl(item.url, item.id) }}
                  className="w-full text-xs bg-white/90 text-[#3d3530] py-1.5 rounded hover:bg-white"
                >
                  {copied === item.id ? '✓ 已复制' : '复制链接'}
                </button>
                <button
                  onClick={e => { e.stopPropagation(); deleteItem(item.id, item.originalName) }}
                  className="w-full text-xs bg-red-500/90 text-white py-1.5 rounded hover:bg-red-500"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 详情面板（选中时） */}
      {selected && (() => {
        const item = items.find(i => i.id === selected)
        if (!item) return null
        return (
          <div className="fixed bottom-6 right-6 w-72 card p-4 shadow-lg z-10">
            <div className="flex items-start justify-between mb-2">
              <p className="text-sm font-medium text-[#3d3530] truncate flex-1 mr-2">{item.originalName}</p>
              <button onClick={() => setSelected(null)} className="text-[#a89880] hover:text-[#5a4f42] text-lg leading-none">×</button>
            </div>
            <p className="text-xs text-[#a89880] mb-1">{item.type === 'IMAGE' ? '图片' : '视频'} · {formatSize(item.size)}</p>
            <p className="text-xs text-[#a89880] font-mono break-all mb-3 bg-[#faf8f5] p-2 rounded">{item.url}</p>
            <button
              onClick={() => copyUrl(item.url, item.id)}
              className="btn-primary w-full justify-center text-sm py-2"
            >
              {copied === item.id ? '✓ 已复制' : '复制链接'}
            </button>
          </div>
        )
      })()}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          {page > 1 && <button onClick={() => setPage(p => p - 1)} className="btn-secondary text-sm">← 上一页</button>}
          <span className="text-sm text-[#a89880] self-center">{page} / {totalPages}</span>
          {page < totalPages && <button onClick={() => setPage(p => p + 1)} className="btn-secondary text-sm">下一页 →</button>}
        </div>
      )}
    </div>
  )
}
