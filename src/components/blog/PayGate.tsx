'use client'
import { useState } from 'react'

export default function PayGate({
  slug,
  price,
  title,
}: {
  slug: string
  price: number
  title: string
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
    } catch (err: any) {
      setStatus('error')
    }
  }

  return (
    <div className="max-w-sm mx-auto text-center py-16">
      <div className="text-5xl mb-4">☕</div>
      <h3 className="font-serif text-xl font-medium mb-2 text-[#221e1a]">打赏解锁</h3>
      <p className="text-sm text-[#8c7d68] mb-1">
        本文需要打赏 <span className="text-[#d4711a] font-medium">¥{price}</span> 解锁
      </p>
      <p className="text-xs text-[#a89880] mb-8">支付成功后将向你的邮箱发送永久访问链接</p>

      <form onSubmit={pay} className="space-y-3">
        <input
          type="email"
          className="input text-center"
          placeholder="你的邮箱（用于接收链接）"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        {status === 'error' && <p className="text-sm text-red-500">跳转失败，请稍后重试</p>}
        <button type="submit" className="btn-primary w-full justify-center" disabled={status === 'loading'}>
          {status === 'loading' ? '跳转支付中…' : `打赏 ¥${price} 解锁 →`}
        </button>
      </form>

      <p className="text-xs text-[#c4b8a7] mt-6">由 Stripe 提供安全支付</p>
    </div>
  )
}
