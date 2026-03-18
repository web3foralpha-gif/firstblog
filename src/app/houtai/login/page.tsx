'use client'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await signIn('credentials', {
      redirect: false,
      email,
      password,
    })

    setLoading(false)

    if (res?.ok) {
      router.replace('/houtai')
    } else {
      setError('邮箱或密码错误，请重试')
    }
  }

  return (
    <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#f0ebe3] mb-4">
            <span className="text-2xl">✦</span>
          </div>
          <h1 className="font-serif text-2xl font-medium text-[#221e1a]">后台管理</h1>
          <p className="text-sm text-[#a89880] mt-1">请登录以继续</p>
        </div>

        {/* 表单 */}
        <form onSubmit={submit} className="bg-white rounded-2xl border border-[#ddd5c8] p-8 space-y-5 shadow-sm">
          <div>
            <label className="text-xs text-[#8c7d68] mb-1.5 block font-medium">邮箱</label>
            <input
              type="email"
              className="w-full px-4 py-2.5 rounded-xl border border-[#ddd5c8] bg-[#faf8f5] text-[#221e1a] text-sm outline-none focus:border-[#d4711a] focus:ring-2 focus:ring-[#d4711a]/20 transition-all"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              autoFocus
              autoComplete="email"
            />
          </div>

          <div>
            <label className="text-xs text-[#8c7d68] mb-1.5 block font-medium">密码</label>
            <input
              type="password"
              className="w-full px-4 py-2.5 rounded-xl border border-[#ddd5c8] bg-[#faf8f5] text-[#221e1a] text-sm outline-none focus:border-[#d4711a] focus:ring-2 focus:ring-[#d4711a]/20 transition-all"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
              <span>✕</span>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-[#221e1a] text-white text-sm font-medium hover:bg-[#3d3530] disabled:opacity-50 transition-colors"
          >
            {loading ? '登录中…' : '登录'}
          </button>
        </form>

        <p className="text-center text-xs text-[#c4b8a7] mt-6">
          <a href="/" className="hover:text-[#d4711a] transition-colors">← 返回博客</a>
        </p>
      </div>
    </div>
  )
}
