'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import AdminWorkspaceFrame from '@/components/houtai/AdminWorkspaceFrame'
import FileUploader from '@/components/houtai/FileUploader'
import { Card } from '@/components/houtai/ui'

type MediaItem = {
  id: string
  originalName: string
  url: string
  type: 'IMAGE' | 'VIDEO' | 'AUDIO'
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
  const [filter, setFilter] = useState<'ALL' | 'IMAGE' | 'VIDEO' | 'AUDIO'>('ALL')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const fetchMedia = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (filter !== 'ALL') params.set('type', filter)
    const res = await fetch(`/api/houtai/media?${params}`)
    const data = await res.json()
    setItems(data.items ?? [])
    setTotal(data.total ?? 0)
    setTotalPages(data.totalPages ?? 1)
    setLoading(false)
  }, [page, filter])

  useEffect(() => {
    void fetchMedia()
  }, [fetchMedia])

  async function deleteItem(id: string, name: string) {
    if (!confirm(`确定删除「${name}」？已插入文章的链接将失效。`)) return
    await fetch('/api/houtai/media', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    void fetchMedia()
    if (selected === id) setSelected(null)
  }

  function copyUrl(url: string, id: string) {
    navigator.clipboard.writeText(url)
    setCopied(id)
    window.setTimeout(() => setCopied(null), 2000)
  }

  const pageStats = useMemo(() => {
    const imageCount = items.filter(item => item.type === 'IMAGE').length
    const videoCount = items.filter(item => item.type === 'VIDEO').length
    const audioCount = items.filter(item => item.type === 'AUDIO').length
    const selectedItem = items.find(item => item.id === selected)

    return [
      { label: '文件总量', value: `${total} 个`, hint: `当前页展示 ${items.length} 个文件。` },
      { label: '图片 / 视频', value: `${imageCount} / ${videoCount}`, hint: `音频 ${audioCount} 个。` },
      { label: '当前筛选', value: filter === 'ALL' ? '全部媒体' : filter === 'IMAGE' ? '图片' : filter === 'VIDEO' ? '视频' : '音频', hint: '切换筛选会自动刷新当前列表。' },
      { label: '已选中文件', value: selectedItem ? formatSize(selectedItem.size) : '未选择', hint: selectedItem ? selectedItem.originalName : '点任意文件可展开详情。' },
    ]
  }, [filter, items, selected, total])

  return (
    <AdminWorkspaceFrame
      eyebrow="Media Library"
      title="媒体库"
      subtitle="上传、筛选、复制和删除媒体资源，都集中在这个工作区里。"
      description="这里现在更像真正的资源中台：先上传，再按类型筛选，最后快速复制链接回到文章编辑器使用。"
      stats={pageStats}
      links={[
        { href: '/houtai/articles', label: '文章库' },
        { href: '/houtai/articles/new', label: '写新文章' },
        { href: '/houtai/settings?section=poster', label: '海报设置' },
      ]}
      actions={(
        <button
          type="button"
          onClick={() => void fetchMedia()}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          刷新媒体库
        </button>
      )}
    >
      <Card className="p-5">
        <p className="mb-3 text-sm font-medium text-slate-800">上传新文件</p>
        <FileUploader accept="both" onSuccess={() => { setPage(1); void fetchMedia() }} />
      </Card>

      <Card>
        <div className="flex flex-wrap gap-2 border-b border-slate-100 p-4">
          {(['ALL', 'IMAGE', 'VIDEO', 'AUDIO'] as const).map(value => (
            <button
              key={value}
              onClick={() => { setFilter(value); setPage(1) }}
              className={`rounded-lg border px-4 py-1.5 text-sm transition-all ${
                filter === value
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {value === 'ALL' ? '全部' : value === 'IMAGE' ? '🖼 图片' : value === 'VIDEO' ? '🎬 视频' : '🎵 音频'}
            </button>
          ))}
        </div>

        <div className="p-4">
          {loading ? (
            <div className="py-16 text-center text-sm text-slate-400">加载中…</div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-400">还没有文件</div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {items.map(item => (
                <div
                  key={item.id}
                  onClick={() => setSelected(selected === item.id ? null : item.id)}
                  className={`group relative cursor-pointer overflow-hidden rounded-xl border transition-all ${
                    selected === item.id ? 'border-slate-900 ring-2 ring-slate-900/10' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex aspect-square items-center justify-center bg-slate-100">
                    {item.type === 'IMAGE' ? (
                      <img src={item.url} alt={item.originalName} className="h-full w-full object-cover" />
                    ) : (
                      <div className="p-2 text-center">
                        <div className="text-3xl">{item.type === 'VIDEO' ? '🎬' : '🎵'}</div>
                        <p className="mt-1 truncate px-1 text-xs text-slate-500">{item.originalName}</p>
                      </div>
                    )}
                  </div>

                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50 p-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={event => { event.stopPropagation(); copyUrl(item.url, item.id) }}
                      className="w-full rounded bg-white/90 py-1.5 text-xs text-slate-800 hover:bg-white"
                    >
                      {copied === item.id ? '✓ 已复制' : '复制链接'}
                    </button>
                    <button
                      onClick={event => { event.stopPropagation(); void deleteItem(item.id, item.originalName) }}
                      className="w-full rounded bg-red-500/90 py-1.5 text-xs text-white hover:bg-red-500"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 ? (
            <div className="mt-8 flex justify-center gap-2">
              {page > 1 ? (
                <button onClick={() => setPage(current => current - 1)} className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50">
                  ← 上一页
                </button>
              ) : null}
              <span className="self-center text-sm text-slate-500">{page} / {totalPages}</span>
              {page < totalPages ? (
                <button onClick={() => setPage(current => current + 1)} className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50">
                  下一页 →
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </Card>

      {selected ? (() => {
        const item = items.find(entry => entry.id === selected)
        if (!item) return null

        return (
          <div className="fixed bottom-6 right-6 z-10 w-80">
            <Card className="p-4 shadow-lg">
              <div className="mb-2 flex items-start justify-between gap-3">
                <p className="flex-1 truncate text-sm font-medium text-slate-800">{item.originalName}</p>
                <button onClick={() => setSelected(null)} className="text-lg leading-none text-slate-400 transition hover:text-slate-600">×</button>
              </div>
              <p className="mb-1 text-xs text-slate-500">
                {item.type === 'IMAGE' ? '图片' : item.type === 'VIDEO' ? '视频' : '音频'} · {formatSize(item.size)}
              </p>
              <p className="mb-3 text-xs text-slate-400">
                上传时间：{new Date(item.createdAt).toLocaleString('zh-CN')}
              </p>
              <p className="break-all rounded-xl bg-slate-50 p-2 font-mono text-xs text-slate-500">{item.url}</p>
              <button
                onClick={() => copyUrl(item.url, item.id)}
                className="btn-primary mt-4 w-full justify-center py-2 text-sm"
              >
                {copied === item.id ? '✓ 已复制' : '复制链接'}
              </button>
            </Card>
          </div>
        )
      })() : null}
    </AdminWorkspaceFrame>
  )
}
