'use client'
import { useState } from 'react'
import Link from 'next/link'

const EMOJIS = ['😊', '🥰', '😌', '🤔', '😄', '🙏', '💭', '🌟', '❤️', '👋']

export default function FloatingGuestbook() {
  const [open, setOpen] = useState(false)
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

  function reset() { setStatus('idle'); setMsg(''); setOpen(false) }

  return (
    <>
      <button
        onClick={() => { setOpen(true); setStatus('idle'); setMsg('') }}
        aria-label="留言"
        className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-[#d4711a] text-white shadow-lg hover:bg-[#b05a14] active:scale-95 transition-all flex items-center justify-center text-xl"
        style={{ boxShadow: '0 4px 20px rgba(212,113,26,0.35)' }}
      >
        ✉
      </button>

      {open && <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={reset} />}

      <div className={`fixed bottom-20 right-6 z-50 w-84 bg-white rounded-2xl shadow-2xl border border-[#f0ebe3] transition-all duration-200 ${
        open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
      }`} style={{ width: 340 }}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#f0ebe3]">
          <div>
            <p className="font-serif font-medium text-[#221e1a]">留下你的足迹</p>
            <p className="text-xs text-[#a89880] mt-0.5">审核后公开</p>
          </div>
          <button onClick={reset} className="text-[#c4b8a7] hover:text-[#5a4f42] text-xl leading-none">×</button>
        </div>

        <div className="px-5 py-4">
          {status === 'success' ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-2">🎉</div>
              <p className="text-sm font-medium text-[#3d3530] mb-1">留言已收到！</p>
              <p className="text-xs text-[#a89880] mb-4">{msg}</p>
              <div className="flex gap-2">
                <button onClick={reset} className="btn-secondary flex-1 text-sm justify-center py-2">关闭</button>
                <Link href="/guestbook" onClick={reset} className="btn-primary flex-1 text-sm justify-center py-2 text-center">去留言板 →</Link>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              {/* 昵称 + 邮箱 */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-[#8c7d68] mb-1 block">昵称 *</label>
                  <input className="input text-sm" value={nickname} onChange={e => setNickname(e.target.value)} placeholder="你的名字" maxLength={20} required autoFocus={open} />
                </div>
                <div>
                  <label className="text-xs text-[#8c7d68] mb-1 block">邮箱（选填）</label>
                  <input type="email" className="input text-sm" value={email} onChange={e => setEmail(e.target.value)} placeholder="可选" />
                </div>
              </div>

              {email && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <div onClick={() => setEmailPublic(p => !p)} className={`w-8 h-4 rounded-full transition-colors relative flex-shrink-0 ${emailPublic ? 'bg-[#d4711a]' : 'bg-[#ddd5c8]'}`}>
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${emailPublic ? 'left-[18px]' : 'left-0.5'}`} />
                  </div>
                  <span className="text-xs text-[#8c7d68]">公开邮箱</span>
                </label>
              )}

              {/* 心情 */}
              <div className="flex flex-wrap gap-1.5">
                {EMOJIS.map(e => (
                  <button key={e} type="button" onClick={() => setSelectedEmoji(selectedEmoji === e ? '' : e)}
                    className={`w-8 h-8 rounded-lg text-base transition-all ${selectedEmoji === e ? 'bg-[#fdf6ee] ring-2 ring-[#d4711a] scale-110' : 'bg-[#faf8f5] hover:bg-[#f0ebe3]'}`}>
                    {e}
                  </button>
                ))}
              </div>

              {/* 内容 */}
              <div>
                <textarea className="input resize-none text-sm" rows={3} value={content}
                  onChange={e => setContent(e.target.value)} placeholder="说点什么吧 ✍️" maxLength={200} />
                <p className="text-xs text-[#c4b8a7] text-right">{content.length} / 200</p>
              </div>

              {status === 'error' && <p className="text-xs text-red-500">{msg}</p>}

              <div className="flex gap-2">
                <button type="submit" disabled={!nickname.trim() || !content.trim() || status === 'loading'}
                  className="btn-primary flex-1 justify-center py-2.5 text-sm disabled:opacity-50">
                  {status === 'loading' ? '提交中…' : '发布 ✨'}
                </button>
                <Link href="/guestbook" onClick={reset} className="btn-secondary px-3 py-2.5 text-sm" title="查看留言板">📋</Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  )
}
