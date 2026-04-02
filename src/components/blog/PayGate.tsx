'use client'
import { useState } from 'react'
import { fillTextTemplate } from '@/lib/text-template'

export default function PayGate({
  slug,
  price,
  copy,
}: {
  slug: string
  price: number
  copy: {
    title: string
    description: string
    hint: string
    emailPlaceholder: string
    errorMessage: string
    submittingLabel: string
    submitLabel: string
    providerHint: string
  }
}) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')

  async function pay(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      window.location.href = data.url
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="max-w-sm mx-auto text-center py-16">
      <div className="text-5xl mb-4">☕</div>
      <h3 className="mb-2 font-serif text-xl font-medium text-[var(--text-primary)]">{copy.title}</h3>
      <p className="mb-1 text-sm text-[var(--text-muted)]">
        {fillTextTemplate(copy.description, { price: `¥${price}` })}
      </p>
      <p className="mb-8 text-xs text-[var(--text-subtle)]">{copy.hint}</p>

      <form onSubmit={pay} className="space-y-3">
        <input
          type="email"
          className="input text-center"
          placeholder={copy.emailPlaceholder}
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        {status === 'error' && <p className="text-sm text-red-500">{copy.errorMessage}</p>}
        <button type="submit" className="btn-primary w-full justify-center" disabled={status === 'loading'}>
          {status === 'loading' ? copy.submittingLabel : fillTextTemplate(copy.submitLabel, { price: `¥${price}` })}
        </button>
      </form>

      <p className="mt-6 text-xs text-[var(--text-faint)]">{copy.providerHint}</p>
    </div>
  )
}
