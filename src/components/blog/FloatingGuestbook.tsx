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

  function reset() { setStatus('idle'); setMsg(''); setOpen(false) }

  return (
    <>
      <button
        onClick={() => { setOpen(true); setStatus('idle'); setMsg('') }}
        aria-label="留言"
        className="fixed bottom-4 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)] text-xl text-white shadow-lg transition-all hover:bg-[var(--accent-hover)] active:scale-95 sm:bottom-6 sm:right-6"
        style={{ boxShadow: '0 4px 20px var(--accent-shadow)' }}
      >
        ✉
      </button>

      {open && <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={reset} />}

      <div className={`fixed bottom-20 right-4 z-50 w-[min(21.25rem,calc(100vw-2rem))] rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-bg)] shadow-2xl transition-all duration-200 sm:right-6 ${
        open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}>
        <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-5 pb-3 pt-5">
          <div>
            <p className="font-serif font-medium text-[var(--text-primary)]">留下你的足迹</p>
            <p className="mt-0.5 text-xs text-[var(--text-subtle)]">审核后公开</p>
          </div>
          <button onClick={reset} className="text-xl leading-none text-[var(--text-faint)] hover:text-[var(--text-secondary)]">×</button>
        </div>

        <div className="px-5 py-4">
          {status === 'success' ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-2">🎉</div>
              <p className="mb-1 text-sm font-medium text-[var(--text-secondary)]">留言已收到！</p>
              <p className="mb-4 text-xs text-[var(--text-subtle)]">{msg}</p>
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
                  <label className="mb-1 block text-xs text-[var(--text-muted)]">昵称 *</label>
                  <input className="input text-sm" value={nickname} onChange={e => setNickname(e.target.value)} placeholder="你的名字" maxLength={20} required autoFocus={open} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[var(--text-muted)]">邮箱（选填）</label>
                  <input type="email" className="input text-sm" value={email} onChange={e => setEmail(e.target.value)} placeholder="可选" />
                </div>
              </div>

              {email && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <div onClick={() => setEmailPublic(p => !p)} className={`relative h-4 w-8 flex-shrink-0 rounded-full transition-colors ${emailPublic ? 'bg-[var(--accent)]' : 'bg-[var(--border-color)]'}`}>
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${emailPublic ? 'left-[18px]' : 'left-0.5'}`} />
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">公开邮箱</span>
                </label>
              )}

              {/* 心情 */}
              <div className="flex flex-wrap gap-1.5">
                {EMOJIS.map(e => (
                  <button key={e} type="button" onClick={() => setSelectedEmoji(selectedEmoji === e ? '' : e)}
                    className={`h-8 w-8 rounded-lg text-base transition-all ${selectedEmoji === e ? 'scale-110 bg-[var(--accent-soft)] ring-2 ring-[var(--accent)]' : 'bg-[var(--surface-muted-bg)] hover:bg-[var(--surface-soft)]'}`}>
                    {e}
                  </button>
                ))}
              </div>

              {/* 内容 */}
              <div>
                <textarea className="input resize-none text-sm" rows={3} value={content}
                  onChange={e => setContent(e.target.value)} placeholder="说点什么吧 ✍️" maxLength={200} />
                <p className="text-right text-xs text-[var(--text-faint)]">{content.length} / 200</p>
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
