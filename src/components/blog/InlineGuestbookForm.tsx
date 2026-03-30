'use client'
import { useState } from 'react'

const EMOJIS = ['😊', '🥰', '😌', '🤔', '😄', '🙏', '💭', '🌟', '❤️', '👋']

export default function InlineGuestbookForm() {
  const [nickname, setNickname] = useState('')
  const [email, setEmail] = useState('')
  const [emailPublic, setEmailPublic] = useState(false)
  const [content, setContent] = useState('')
  const [selectedEmoji, setSelectedEmoji] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (status === 'loading') return
    if (!nickname.trim() || !content.trim()) return
    setStatus('loading')
    setMsg('')
    try {
      const res = await fetch('/api/guestbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, email, emailPublic, content, emoji: selectedEmoji }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(String(data?.error || '提交失败，请重试'))
      setStatus('success')
      setMsg(String(data?.message || '留言已提交，审核后会展示在留言板'))
      setNickname(''); setEmail(''); setContent(''); setSelectedEmoji(''); setEmailPublic(false)
    } catch (err: any) {
      setStatus('error')
      setMsg(err.message || '提交失败，请重试')
    }
  }

  if (status === 'success') {
    return (
      <div className="card px-8 py-10 text-center mb-10">
        <div className="text-4xl mb-3">🎉</div>
        <p className="mb-1 font-medium text-[var(--text-secondary)]">留言已收到！</p>
        <p className="mb-5 text-sm text-[var(--text-subtle)]">{msg}</p>
        <button onClick={() => setStatus('idle')} className="btn-secondary text-sm">再写一条</button>
      </div>
    )
  }

  return (
    <div className="card px-4 sm:px-6 py-5 sm:py-6 mb-10">
      <h2 className="mb-1 font-serif text-lg font-medium text-[var(--text-primary)]">写下你的留言</h2>
      <p className="mb-5 text-xs text-[var(--text-subtle)]">审核通过后公开展示</p>

      <form onSubmit={submit} className="space-y-4">
        {/* 昵称 + 邮箱 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-[var(--text-muted)]">昵称 *</label>
            <input
              className="input"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              placeholder="你的名字"
              maxLength={20}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--text-muted)]">邮箱（可选）</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
            />
          </div>
        </div>

        {/* 邮箱公开选项（仅填了邮箱才显示） */}
        {email && (
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              onClick={() => setEmailPublic(p => !p)}
              className={`relative h-5 w-9 flex-shrink-0 rounded-full transition-colors ${emailPublic ? 'bg-[var(--accent)]' : 'bg-[var(--border-color)]'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${emailPublic ? 'left-[18px]' : 'left-0.5'}`} />
            </div>
            <span className="text-xs text-[var(--text-secondary)]">
              {emailPublic ? '公开邮箱（其他访客可见）' : '不公开邮箱（仅博主可见）'}
            </span>
          </label>
        )}

        {/* 心情 */}
        <div>
          <p className="mb-2 text-xs text-[var(--text-muted)]">选个心情（可选）</p>
          <div className="flex flex-wrap gap-2">
            {EMOJIS.map(e => (
              <button
                key={e}
                type="button"
                onClick={() => setSelectedEmoji(selectedEmoji === e ? '' : e)}
                className={`w-9 h-9 rounded-lg text-lg transition-all ${
                  selectedEmoji === e
                    ? 'scale-110 bg-[var(--accent-soft)] ring-2 ring-[var(--accent)]'
                    : 'bg-[var(--surface-muted-bg)] hover:bg-[var(--surface-soft)]'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* 内容 */}
        <div>
          <label className="mb-1 block text-xs text-[var(--text-muted)]">留言内容 *</label>
          <textarea
            className="input resize-none"
            rows={4}
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="说点什么吧 ✍️"
            maxLength={200}
            required
          />
          <p className="mt-1 text-right text-xs text-[var(--text-faint)]">{content.length} / 200</p>
        </div>

        {status === 'error' && <p className="text-sm text-red-500">{msg}</p>}

        <button type="submit" disabled={!nickname.trim() || !content.trim() || status === 'loading'} className="btn-primary disabled:opacity-50">
          {status === 'loading' ? '提交中…' : '发布留言 ✨'}
        </button>
      </form>
    </div>
  )
}
