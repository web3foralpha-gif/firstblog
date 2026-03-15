'use client'
import { useState } from 'react'

export default function PasswordGate({
  slug,
  hint,
  onUnlock,
}: {
  slug: string
  hint?: string | null
  onUnlock: (content: string) => void
}) {
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    try {
      const res = await fetch(`/api/articles/${slug}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) { setStatus('error'); return }
      const { content } = await res.json()
      onUnlock(content)
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="max-w-sm mx-auto text-center py-16 px-4">
      <div className="text-5xl mb-4">🔒</div>
      <h3 className="font-serif text-xl font-medium mb-2 text-[#221e1a]">此文章已加密</h3>
      <p className="text-sm text-[#8c7d68] mb-8">请输入密码继续阅读</p>

      <form onSubmit={submit} className="space-y-3">
        <div className="relative">
          <input
            type="password"
            className="input text-center w-full pr-4"
            placeholder={hint ? `提示：${hint}` : '输入密码，获取真经'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus
          />
          {/* 提示标签 */}
          {hint && (
            <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-[#a89880]">
              <span>💡</span>
              <span>密码提示：{hint}</span>
            </div>
          )}
        </div>

        {status === 'error' && (
          <p className="text-sm text-red-500 flex items-center justify-center gap-1">
            <span>✕</span> 密码错误，请重试
          </p>
        )}

        <button
          type="submit"
          className="btn-primary w-full justify-center"
          disabled={status === 'loading' || !password.trim()}
        >
          {status === 'loading' ? '验证中…' : '解锁 →'}
        </button>
      </form>
    </div>
  )
}
