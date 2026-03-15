'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SunflowerReset() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function reset() {
    if (!confirm('⚠️ 确定重置向日葵？所有互动记录将清空，向日葵回到种子阶段。此操作不可撤销。')) return
    setLoading(true)
    await fetch('/api/admin/sunflower', { method: 'POST' })
    setLoading(false)
    router.refresh()
  }

  return (
    <button
      onClick={reset}
      disabled={loading}
      className="text-xs text-red-400 hover:text-red-600 hover:underline disabled:opacity-50 transition-colors"
    >
      {loading ? '重置中…' : '🔄 重置向日葵（测试用）'}
    </button>
  )
}
