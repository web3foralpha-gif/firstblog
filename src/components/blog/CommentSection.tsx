'use client'
import { useState } from 'react'
import { formatDate } from '@/lib/utils'

type Comment = {
  id: string
  nickname: string
  email?: string
  content: string
  createdAt: string
}

export default function CommentSection({ articleId, comments }: { articleId: string; comments: Comment[] }) {
  const [form, setForm] = useState({ nickname: '', email: '', content: '' })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nickname.trim() || !form.content.trim()) {
      setMsg('请填写昵称和评论内容')
      setStatus('error')
      return
    }
    setStatus('loading')
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, articleId }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setStatus('error')
        setMsg(String(data?.error || '提交失败，请稍后重试'))
        return
      }
      setStatus('success')
      setMsg('评论已提交，审核通过后即可显示 🎉')
      setForm({ nickname: '', email: '', content: '' })
    } catch {
      setStatus('error')
      setMsg('提交失败，请稍后重试')
    }
  }

  return (
    <section className="mt-12">
      <hr className="divider" />
      <h3 className="font-serif text-xl font-medium mb-6 text-[#221e1a]">
        评论 <span className="text-[#a89880] font-normal text-base">({comments.length})</span>
      </h3>

      {comments.length === 0 ? (
        <p className="text-[#a89880] text-sm mb-8">还没有评论，来说第一句话吧 ✍️</p>
      ) : (
        <div className="space-y-6 mb-10">
          {comments.map(c => (
            <div key={c.id} className="flex gap-4">
              <div className="w-9 h-9 rounded-full bg-[#faeeda] flex items-center justify-center text-[#d4711a] font-medium text-sm flex-shrink-0">
                {c.nickname[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-medium text-sm text-[#3d3530]">{c.nickname}</span>
                  <time className="text-xs text-[#a89880]">{formatDate(c.createdAt)}</time>
                </div>
                {c.email && (
                  <a
                    href={`mailto:${c.email}`}
                    className="mb-1 block text-xs text-[#a89880] hover:text-[#d4711a] transition-colors break-all"
                  >
                    {c.email}
                  </a>
                )}
                <p className="text-[14px] text-[#5a4f42] leading-relaxed whitespace-pre-wrap">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-[#faf8f5] border border-[#ddd5c8] rounded-lg p-6">
        <h4 className="font-medium text-[15px] mb-4 text-[#3d3530]">留下你的足迹</h4>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs text-[#8c7d68] mb-1 block">昵称 *</label>
              <input
                className="input"
                value={form.nickname}
                onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))}
                placeholder="你的名字"
                maxLength={30}
              />
            </div>
            <div>
              <label className="text-xs text-[#8c7d68] mb-1 block">
                邮箱 <span className="text-[#c4b8a7]">（可选）</span>
              </label>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="your@email.com"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-[#8c7d68] mb-1 block">评论 *</label>
            <textarea
              className="input resize-none"
              rows={4}
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              placeholder="说点什么吧…"
              maxLength={1000}
            />
          </div>
          {msg && (
            <p className={`text-sm ${status === 'error' ? 'text-red-500' : 'text-green-600'}`}>{msg}</p>
          )}
          <button type="submit" className="btn-primary" disabled={status === 'loading'}>
            {status === 'loading' ? '提交中…' : '发表评论'}
          </button>
        </form>
      </div>
    </section>
  )
}
