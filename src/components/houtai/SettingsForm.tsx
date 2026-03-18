'use client'
import { useState } from 'react'

export default function SettingsForm({ defaultAbout }: { defaultAbout: string }) {
  const [about, setAbout] = useState(defaultAbout)
  const [status, setStatus] = useState<'idle' | 'loading' | 'saved' | 'error'>('idle')

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    const res = await fetch('/api/houtai/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'about_content', value: about }),
    })
    setStatus(res.ok ? 'saved' : 'error')
    setTimeout(() => setStatus('idle'), 2000)
  }

  return (
    <form onSubmit={save} className="max-w-2xl space-y-6">
      <div className="card p-6">
        <h2 className="font-medium text-[15px] text-[#221e1a] mb-1">「关于我」页面内容</h2>
        <p className="text-xs text-[#a89880] mb-4">支持 Markdown 格式</p>
        <textarea
          className="input markdown-editor"
          value={about}
          onChange={e => setAbout(e.target.value)}
          placeholder="介绍一下自己吧…"
          rows={12}
        />
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary" disabled={status === 'loading'}>
          {status === 'loading' ? '保存中…' : status === 'saved' ? '✓ 已保存' : '保存设置'}
        </button>
        {status === 'error' && <p className="text-sm text-red-500">保存失败，请重试</p>}
      </div>
    </form>
  )
}
