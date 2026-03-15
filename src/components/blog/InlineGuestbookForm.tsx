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
    if (!nickname.trim() || !content.trim()) return
    setStatus('loading')
    try {
      const res = await fetch('/api/guestbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, email, emailPublic, content, emoji: selectedEmoji }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setStatus('success')
      setMsg(data.message)
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
        <p className="font-medium text-[#3d3530] mb-1">留言已收到！</p>
        <p className="text-sm text-[#a89880] mb-5">{msg}</p>
        <button onClick={() => setStatus('idle')} className="btn-secondary text-sm">再写一条</button>
      </div>
    )
  }

  return (
    <div className="card px-4 sm:px-6 py-5 sm:py-6 mb-10">
      <h2 className="font-serif text-lg font-medium text-[#221e1a] mb-1">写下你的留言</h2>
      <p className="text-xs text-[#a89880] mb-5">审核通过后公开展示</p>

      <form onSubmit={submit} className="space-y-4">
        {/* 昵称 + 邮箱 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[#8c7d68] mb-1 block">昵称 *</label>
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
            <label className="text-xs text-[#8c7d68] mb-1 block">邮箱（可选）</label>
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
              className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 relative ${emailPublic ? 'bg-[#d4711a]' : 'bg-[#ddd5c8]'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${emailPublic ? 'left-[18px]' : 'left-0.5'}`} />
            </div>
            <span className="text-xs text-[#5a4f42]">
              {emailPublic ? '公开邮箱（其他访客可见）' : '不公开邮箱（仅博主可见）'}
            </span>
          </label>
        )}

        {/* 心情 */}
        <div>
          <p className="text-xs text-[#8c7d68] mb-2">选个心情（可选）</p>
          <div className="flex flex-wrap gap-2">
            {EMOJIS.map(e => (
              <button
                key={e}
                type="button"
                onClick={() => setSelectedEmoji(selectedEmoji === e ? '' : e)}
                className={`w-9 h-9 rounded-lg text-lg transition-all ${
                  selectedEmoji === e
                    ? 'bg-[#fdf6ee] ring-2 ring-[#d4711a] scale-110'
                    : 'bg-[#faf8f5] hover:bg-[#f0ebe3]'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* 内容 */}
        <div>
          <label className="text-xs text-[#8c7d68] mb-1 block">留言内容 *</label>
          <textarea
            className="input resize-none"
            rows={4}
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="说点什么吧 ✍️"
            maxLength={200}
            required
          />
          <p className="text-xs text-[#c4b8a7] text-right mt-1">{content.length} / 200</p>
        </div>

        {status === 'error' && <p className="text-sm text-red-500">{msg}</p>}

        <button type="submit" disabled={!nickname.trim() || !content.trim() || status === 'loading'} className="btn-primary disabled:opacity-50">
          {status === 'loading' ? '提交中…' : '发布留言 ✨'}
        </button>
      </form>
    </div>
  )
}
