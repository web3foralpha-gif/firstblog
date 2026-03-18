'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function DeleteArticleButton({ id, title }: { id: string; title: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm(`确定删除文章《${title}》？此操作不可撤销。`)) return
    setLoading(true)
    await fetch(`/api/houtai/articles/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-xs text-red-400 hover:text-red-600 hover:underline disabled:opacity-50"
    >
      {loading ? '…' : '删除'}
    </button>
  )
}
