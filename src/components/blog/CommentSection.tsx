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
    <section id="comments" className="mt-12 space-y-5">
      <div className="theme-panel-soft p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-faint)]">Comments</p>
            <h3 className="mt-2 font-serif text-2xl font-medium text-[var(--text-primary)]">
              {copy.sectionTitle}
            </h3>
          </div>
          <span className="theme-chip !shadow-none">{comments.length} 条</span>
        </div>

        {comments.length === 0 ? (
          <div className="py-12 text-center text-[var(--text-subtle)]">
            <p className="mb-4 text-4xl">💬</p>
            <p className="text-sm">{copy.emptyText}</p>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {comments.map(comment => (
              <article key={comment.id} className="rounded-[24px] border border-[var(--border-soft)] bg-white/70 p-4 sm:p-5">
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-[var(--border-soft)] bg-[var(--accent-soft)] text-sm font-medium text-[var(--accent)] shadow-inner shadow-white/70">
                    {comment.nickname[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-[var(--text-primary)]">{comment.nickname}</span>
                      <time className="text-xs text-[var(--text-faint)]">{formatDate(comment.createdAt)}</time>
                    </div>
                    {comment.email ? (
                      <a
                        href={`mailto:${comment.email}`}
                        className="mt-1 block break-all text-xs text-[var(--text-subtle)] transition-colors hover:text-[var(--accent)]"
                      >
                        {comment.email}
                      </a>
                    ) : null}
                    <p className="mt-3 whitespace-pre-wrap text-[14px] leading-7 text-[var(--text-secondary)]">{comment.content}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="theme-panel-soft p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-faint)]">Reply</p>
            <h4 className="mt-2 font-serif text-2xl font-medium text-[var(--text-primary)]">{copy.formTitle}</h4>
          </div>
          <p className="text-sm text-[var(--text-subtle)]">昵称和内容必填，邮箱仍然保持可选。</p>
        </div>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs text-[var(--text-muted)]">{copy.nicknameLabel}</label>
              <input
                className="input"
                value={form.nickname}
                onChange={e => setForm(current => ({ ...current, nickname: e.target.value }))}
                placeholder={copy.nicknamePlaceholder}
                maxLength={30}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-[var(--text-muted)]">
                {copy.emailLabel} <span className="text-[var(--text-faint)]">{copy.emailOptionalLabel}</span>
              </label>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={e => setForm(current => ({ ...current, email: e.target.value }))}
                placeholder={copy.emailPlaceholder}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-[var(--text-muted)]">{copy.contentLabel}</label>
            <textarea
              className="input resize-none"
              rows={5}
              value={form.content}
              onChange={e => setForm(current => ({ ...current, content: e.target.value }))}
              placeholder={copy.contentPlaceholder}
              maxLength={1000}
            />
          </div>

          {msg ? (
            <p className={`text-sm ${status === 'error' ? 'text-red-500' : 'text-green-600'}`}>{msg}</p>
          ) : null}

          <button type="submit" className="btn-primary" disabled={status === 'loading'}>
            {status === 'loading' ? copy.submittingLabel : copy.submitLabel}
          </button>
        </form>
      </div>
    </section>
  )
}
