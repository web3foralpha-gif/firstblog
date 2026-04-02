'use client'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { getClientDeviceInfoSync } from '@/lib/client-device'
import { formatDate } from '@/lib/utils'
import { getSafeReferrer, getSessionId, getVisitorId } from '@/lib/visitor'

type Comment = {
  id: string
  nickname: string
  email?: string
  content: string
  createdAt: string
}

type CommentSectionCopy = {
  sectionTitle: string
  emptyText: string
  formTitle: string
  nicknameLabel: string
  nicknamePlaceholder: string
  emailLabel: string
  emailOptionalLabel: string
  emailPlaceholder: string
  contentLabel: string
  contentPlaceholder: string
  submitLabel: string
  submittingLabel: string
  requiredError: string
  successMessage: string
  errorMessage: string
}

export default function CommentSection({
  articleId,
  comments,
  copy,
}: {
  articleId: string
  comments: Comment[]
  copy: CommentSectionCopy
}) {
  const pathname = usePathname()
  const [form, setForm] = useState({ nickname: '', email: '', content: '' })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (status === 'loading') return
    if (!form.nickname.trim() || !form.content.trim()) {
      setMsg(copy.requiredError)
      setStatus('error')
      return
    }
    setStatus('loading')
    setMsg('')
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          articleId,
          visitorId: getVisitorId(),
          sessionId: getSessionId(),
          path: pathname,
          referrer: getSafeReferrer(),
          deviceInfo: getClientDeviceInfoSync(),
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setStatus('error')
        setMsg(String(data?.error || copy.errorMessage))
        return
      }
      setStatus('success')
      setMsg(copy.successMessage)
      setForm({ nickname: '', email: '', content: '' })
    } catch {
      setStatus('error')
      setMsg(copy.errorMessage)
    }
  }

  return (
    <section id="comments" className="mt-12">
      <hr className="divider" />
      <h3 className="mb-6 font-serif text-xl font-medium text-[var(--text-primary)]">
        {copy.sectionTitle} <span className="text-base font-normal text-[var(--text-subtle)]">({comments.length})</span>
      </h3>

      {comments.length === 0 ? (
        <p className="mb-8 text-sm text-[var(--text-subtle)]">{copy.emptyText}</p>
      ) : (
        <div className="space-y-6 mb-10">
          {comments.map(c => (
            <div key={c.id} className="flex gap-4">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-medium text-[var(--accent)]">
                {c.nickname[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-sm font-medium text-[var(--text-secondary)]">{c.nickname}</span>
                  <time className="text-xs text-[var(--text-subtle)]">{formatDate(c.createdAt)}</time>
                </div>
                {c.email && (
                  <a
                    href={`mailto:${c.email}`}
                    className="mb-1 block break-all text-xs text-[var(--text-subtle)] transition-colors hover:text-[var(--accent)]"
                  >
                    {c.email}
                  </a>
                )}
                <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-[var(--text-secondary)]">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--surface-muted-bg)] p-6">
        <h4 className="mb-4 text-[15px] font-medium text-[var(--text-secondary)]">{copy.formTitle}</h4>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-[var(--text-muted)]">{copy.nicknameLabel}</label>
              <input
                className="input"
                value={form.nickname}
                onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))}
                placeholder={copy.nicknamePlaceholder}
                maxLength={30}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--text-muted)]">
                {copy.emailLabel} <span className="text-[var(--text-faint)]">{copy.emailOptionalLabel}</span>
              </label>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder={copy.emailPlaceholder}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--text-muted)]">{copy.contentLabel}</label>
            <textarea
              className="input resize-none"
              rows={4}
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              placeholder={copy.contentPlaceholder}
              maxLength={1000}
            />
          </div>
          {msg && (
            <p className={`text-sm ${status === 'error' ? 'text-red-500' : 'text-green-600'}`}>{msg}</p>
          )}
          <button type="submit" className="btn-primary" disabled={status === 'loading'}>
            {status === 'loading' ? copy.submittingLabel : copy.submitLabel}
          </button>
        </form>
      </div>
    </section>
  )
}
