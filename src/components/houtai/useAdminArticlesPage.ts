'use client'

import { useCallback, useEffect, useState } from 'react'

import { useConfirm, useToast } from '@/components/houtai/ui'

export type AdminArticleRow = {
  id: string
  slug: string
  title: string
  mood: string
  accessType: string
  createdAt: string
  _count: { comments: number }
  published: boolean
  pinned: boolean
}

export const ADMIN_ARTICLES_PAGE_SIZE = 15

export function useAdminArticlesPage() {
  const toast = useToast()
  const { confirm, dialog } = useConfirm()

  const [rows, setRows] = useState<AdminArticleRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [sortKey, setSortKey] = useState('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)

    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(ADMIN_ARTICLES_PAGE_SIZE),
      search,
      filter,
      sortKey,
      sortDir,
    })

    try {
      const response = await fetch(`/api/houtai/articles?${params}`)
      const data = await response.json()

      setRows(data.articles ?? [])
      setTotal(data.total ?? 0)
    } finally {
      setLoading(false)
    }
  }, [filter, page, search, sortDir, sortKey])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setPage(1)
  }, [filter, search])

  const handleSort = useCallback((key: string) => {
    if (sortKey === key) {
      setSortDir(current => (current === 'asc' ? 'desc' : 'asc'))
      return
    }

    setSortKey(key)
    setSortDir('desc')
  }, [sortKey])

  const deleteArticle = useCallback(async (id: string, title: string) => {
    const approved = await confirm('删除文章', `确定要删除《${title}》吗？此操作不可撤销。`, {
      danger: true,
      confirmLabel: '确认删除',
    })
    if (!approved) return

    const response = await fetch(`/api/houtai/articles/${id}`, { method: 'DELETE' })
    if (!response.ok) {
      toast('删除失败', 'error')
      return
    }

    toast('文章已删除')
    void load()
  }, [confirm, load, toast])

  const togglePin = useCallback(async (id: string, pinned: boolean) => {
    const response = await fetch(`/api/houtai/articles/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned }),
    })

    if (!response.ok) {
      toast('置顶操作失败', 'error')
      return
    }

    toast(pinned ? '文章已置顶' : '文章已取消置顶')
    void load()
  }, [load, toast])

  return {
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
  }
}
