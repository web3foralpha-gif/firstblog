'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Status = 'PENDING' | 'APPROVED' | 'REJECTED'

export default function CommentActions({ id, status }: { id: string; status: Status }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function action(type: 'approve' | 'reject' | 'delete') {
    setLoading(type)
    if (type === 'delete') {
      if (!confirm('确定删除这条评论？')) { setLoading(null); return }
      await fetch(`/api/houtai/comments/${id}`, { method: 'DELETE' })
    } else {
      await fetch(`/api/houtai/comments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: type === 'approve' ? 'APPROVED' : 'REJECTED' }),
      })
    }
    setLoading(null)
    router.refresh()
  }

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      {status !== 'APPROVED' && (
        <button
          onClick={() => action('approve')}
          disabled={!!loading}
          className="text-xs text-green-600 hover:underline disabled:opacity-50"
        >
          {loading === 'approve' ? '…' : '通过'}
        </button>
      )}
      {status !== 'REJECTED' && (
        <button
          onClick={() => action('reject')}
          disabled={!!loading}
          className="text-xs text-[#a89880] hover:text-[#5a4f42] hover:underline disabled:opacity-50"
        >
          {loading === 'reject' ? '…' : '拒绝'}
        </button>
      )}
      <button
        onClick={() => action('delete')}
        disabled={!!loading}
        className="text-xs text-red-400 hover:text-red-600 hover:underline disabled:opacity-50"
      >
        {loading === 'delete' ? '…' : '删除'}
      </button>
    </div>
  )
}
