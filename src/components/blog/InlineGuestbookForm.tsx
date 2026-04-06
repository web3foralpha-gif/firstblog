'use client'

import { useState } from 'react'

const EMOJIS = ['😊', '🥰', '😌', '🤔', '😄', '🙏', '💭', '🌟', '❤️', '👋']

type InlineGuestbookFormCopy = {
  formTitle: string
  formSubtitle: string
  nicknameLabel: string
  nicknamePlaceholder: string
  emailLabel: string
  emailPlaceholder: string
  emailPublicOnLabel: string
  emailPublicOffLabel: string
  emojiLabel: string
  contentLabel: string
  contentPlaceholder: string
  submitLabel: string
  submittingLabel: string
  successTitle: string
  successMessage: string
  successActionLabel: string
}

export default function InlineGuestbookForm({ copy }: { copy: InlineGuestbookFormCopy }) {
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
      setMsg(copy.successMessage || String(data?.message || '留言已提交，审核后会展示在留言板'))
      setNickname('')
      setEmail('')
      setContent('')
      setSelectedEmoji('')
      setEmailPublic(false)
    } catch (err: any) {
      setStatus('error')
      setMsg(err.message || '提交失败，请重试')
    }
  }

  if (status === 'success') {
    return (
      <div className="theme-panel-soft px-5 py-8 text-center sm:px-6">
        <div className="text-4xl">🎉</div>
        <p className="mt-4 font-serif text-2xl font-medium text-[var(--text-primary)]">{copy.successTitle}</p>
        <p className="mt-3 text-sm leading-7 text-[var(--text-subtle)]">{msg}</p>
        <button onClick={() => setStatus('idle')} className="btn-secondary mt-5 text-sm">
          {copy.successActionLabel}
        </button>
      </div>
    )
  }

  return (
    <div className="theme-panel-soft px-5 py-5 sm:px-6 sm:py-6">
      <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-faint)]">Leave a note</p>
      <h2 className="mt-3 font-serif text-2xl font-medium text-[var(--text-primary)]">{copy.formTitle}</h2>
      <p className="mt-2 text-sm leading-7 text-[var(--text-subtle)]">{copy.formSubtitle}</p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs text-[var(--text-muted)]">{copy.nicknameLabel}</label>
            <input
              className="input"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              placeholder={copy.nicknamePlaceholder}
              maxLength={20}
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-[var(--text-muted)]">{copy.emailLabel}</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={copy.emailPlaceholder}
            />
          </div>
        </div>

        {email ? (
          <label className="flex cursor-pointer items-center gap-2 select-none rounded-[18px] border border-[var(--border-soft)] bg-white/60 px-3 py-2">
            <div
              onClick={() => setEmailPublic(publicValue => !publicValue)}
              className={`relative h-5 w-9 flex-shrink-0 rounded-full transition-colors ${emailPublic ? 'bg-[var(--accent)]' : 'bg-[var(--border-color)]'}`}
            >
              <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${emailPublic ? 'left-[18px]' : 'left-0.5'}`} />
            </div>
            <span className="text-xs text-[var(--text-secondary)]">
              {emailPublic ? copy.emailPublicOnLabel : copy.emailPublicOffLabel}
            </span>
          </label>
        ) : null}

        <div>
          <p className="mb-2 text-xs text-[var(--text-muted)]">{copy.emojiLabel}</p>
          <div className="flex flex-wrap gap-2">
            {EMOJIS.map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => setSelectedEmoji(selectedEmoji === emoji ? '' : emoji)}
                className={`h-9 w-9 rounded-2xl text-lg transition-all ${
                  selectedEmoji === emoji
                    ? 'scale-110 bg-[var(--accent-soft)] ring-2 ring-[var(--accent)]'
                    : 'bg-[var(--surface-muted-bg)] hover:bg-[var(--surface-soft)]'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs text-[var(--text-muted)]">{copy.contentLabel}</label>
          <textarea
            className="input resize-none"
            rows={5}
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={copy.contentPlaceholder}
            maxLength={200}
            required
          />
          <p className="mt-1 text-right text-xs text-[var(--text-faint)]">{content.length} / 200</p>
        </div>

        {status === 'error' ? <p className="text-sm text-red-500">{msg}</p> : null}

        <button
          type="submit"
          disabled={!nickname.trim() || !content.trim() || status === 'loading'}
          className="btn-primary w-full justify-center disabled:opacity-50"
        >
          {status === 'loading' ? copy.submittingLabel : copy.submitLabel}
        </button>
      </form>
    </div>
  )
}
