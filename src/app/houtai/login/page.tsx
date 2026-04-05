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
    <div className="min-h-screen bg-[var(--bg-color)] px-4 py-10 sm:py-16">
      <div className="mx-auto grid w-full max-w-4xl gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(340px,420px)] lg:items-center">
        <section className="theme-panel-soft hidden min-h-[420px] flex-col justify-between p-8 lg:flex">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--text-faint)]">Admin Access</p>
            <h1 className="mt-4 font-serif text-3xl font-medium text-[var(--text-primary)]">后台控制台入口</h1>
            <p className="mt-4 max-w-md text-sm leading-7 text-[var(--text-subtle)]">
              这里专门处理文章、统计、互动和站点设置。登录后会直接进入已经收纳过的后台工作台。
            </p>
          </div>
          <div className="space-y-3 text-sm text-[var(--text-subtle)]">
            <div className="rounded-2xl border border-[var(--border-soft)] bg-white/70 px-4 py-3">
              文章编辑、封面、权限、海报与互动，都已经集中在后台里。
            </div>
            <div className="rounded-2xl border border-[var(--border-soft)] bg-white/70 px-4 py-3">
              如果只是想回前台看看，下面右侧保留了直接返回博客的入口。
            </div>
          </div>
        </section>

        <div className="w-full">
          <div className="mb-8 text-center lg:hidden">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-soft)] text-2xl">
              ✦
            </div>
            <h1 className="mt-4 font-serif text-2xl font-medium text-[var(--text-primary)]">后台管理</h1>
            <p className="mt-1 text-sm text-[var(--text-subtle)]">请登录以继续</p>
          </div>

          <form onSubmit={submit} className="rounded-[28px] border border-[var(--border-color)] bg-white p-8 shadow-sm sm:p-9">
            <div className="mb-6 hidden text-center lg:block">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-soft)] text-2xl">
                ✦
              </div>
              <h1 className="mt-4 font-serif text-2xl font-medium text-[var(--text-primary)]">后台管理</h1>
              <p className="mt-1 text-sm text-[var(--text-subtle)]">请登录以继续</p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-subtle)]">邮箱</label>
                <input
                  type="email"
                  className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition-all focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  required
                  autoFocus
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-subtle)]">密码</label>
                <input
                  type="password"
                  className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition-all focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                  <span>✕</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-slate-900 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
              >
                {loading ? '登录中…' : '登录'}
              </button>
            </div>
          </form>

          <p className="mt-6 text-center text-xs text-[var(--text-faint)]">
            <a href="/" className="transition-colors hover:text-[var(--accent)]">← 返回博客</a>
          </p>
        </div>
      </div>
    </div>
  )
}
