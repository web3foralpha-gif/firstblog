'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MOODS } from '@/lib/utils'
import MediaToolbar from './MediaToolbar'
import CoverPicker from './CoverPicker'
import RichMarkdown from '@/components/blog/RichMarkdown'
import { stringifyRichStyle, type RichAlign, type RichColor, type RichFont, type RichSize } from '@/lib/rich-text'

type ArticleFormProps = {
  mode: 'new' | 'edit'
  articleId?: string
  defaultValues?: {
    title: string
    content: string
    mood: string
    coverImage?: string | null
    accessType: 'PUBLIC' | 'PASSWORD' | 'PAID'
    password?: string
    passwordHint?: string | null
    price?: number | null
    pinned?: boolean
    published: boolean
  }
}

type SelectionUpdate = {
  text: string
  selectionStart?: number
  selectionEnd?: number
}

export default function ArticleForm({ mode, articleId, defaultValues }: ArticleFormProps) {
  const router = useRouter()
  const d = defaultValues
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const selectionRef = useRef({ start: 0, end: 0 })
  const [title, setTitle] = useState(d?.title || '')
  const [content, setContent] = useState(d?.content || '')
  const [mood, setMood] = useState(d?.mood || '😊')
  const [coverImage, setCoverImage] = useState(d?.coverImage || '')
  const [accessType, setAccessType] = useState<'PUBLIC' | 'PASSWORD' | 'PAID'>(d?.accessType || 'PUBLIC')
  const [password, setPassword] = useState(d?.password || '')
  const [passwordHint, setPasswordHint] = useState(d?.passwordHint || '')
  const [price, setPrice] = useState<string>(d?.price ? String(d.price) : '5')
  const [pinned, setPinned] = useState(d?.pinned ?? false)
  const [published, setPublished] = useState(d?.published ?? true)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(false)

  function rememberSelection() {
    const textarea = textareaRef.current
    if (!textarea) return
    selectionRef.current = {
      start: textarea.selectionStart ?? 0,
      end: textarea.selectionEnd ?? 0,
    }
  }

  function getSelectionRange() {
    const textarea = textareaRef.current
    if (textarea && document.activeElement === textarea) {
      return {
        start: textarea.selectionStart ?? 0,
        end: textarea.selectionEnd ?? 0,
      }
    }
    if (selectionRef.current.start === 0 && selectionRef.current.end === 0) {
      return { start: content.length, end: content.length }
    }
    return selectionRef.current
  }

  function updateSelection(builder: (selected: string, start: number, end: number) => SelectionUpdate) {
    const textarea = textareaRef.current
    const { start, end } = getSelectionRange()
    const selected = content.slice(start, end)
    const next = builder(selected, start, end)
    const newContent = content.slice(0, start) + next.text + content.slice(end)

    setContent(newContent)

    setTimeout(() => {
      if (!textareaRef.current) return
      textareaRef.current.focus()
      const nextStart = start + (next.selectionStart ?? next.text.length)
      const nextEnd = start + (next.selectionEnd ?? next.selectionStart ?? next.text.length)
      textareaRef.current.selectionStart = nextStart
      textareaRef.current.selectionEnd = nextEnd
      selectionRef.current = { start: nextStart, end: nextEnd }
    }, 0)
  }

  function insertAtCursor(text: string) {
    updateSelection(() => ({
      text,
      selectionStart: text.length,
      selectionEnd: text.length,
    }))
  }

  function wrapSelection(before: string, after: string, placeholder = '在这里输入内容') {
    updateSelection(selected => {
      const body = selected || placeholder
      return {
        text: `${before}${body}${after}`,
        selectionStart: before.length,
        selectionEnd: before.length + body.length,
      }
    })
  }

  function applyStyleBlock(style: { font: RichFont; size: RichSize; color: RichColor; align: RichAlign }) {
    updateSelection((selected, start, end) => {
      const beforeText = content.slice(0, start)
      const afterText = content.slice(end)
      const body = selected.trim() || '在这里输入段落内容'
      const leading = beforeText.endsWith('\n') || beforeText.length === 0 ? '' : '\n'
      const trailing = afterText.startsWith('\n') || afterText.length === 0 ? '' : '\n'
      const open = `:::style ${stringifyRichStyle(style)}\n`
      const close = '\n:::'
      const text = `${leading}${open}${body}${close}${trailing}`
      const selectionStart = leading.length + open.length
      const selectionEnd = selectionStart + body.length

      return { text, selectionStart, selectionEnd }
    })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !content.trim()) {
      setError('标题和内容不能为空')
      setStatus('error')
      return
    }
    if (accessType === 'PASSWORD' && !password.trim()) {
      setError('请设置访问密码')
      setStatus('error')
      return
    }
    if (accessType === 'PAID' && (!price || Number(price) <= 0)) {
      setError('请设置有效的打赏金额')
      setStatus('error')
      return
    }

    setStatus('loading')
    setError('')

    const body: Record<string, unknown> = {
      title: title.trim(),
      content: content.trim(),
      mood,
      coverImage: coverImage || null,
      accessType,
      pinned,
      published,
    }

    if (accessType === 'PASSWORD') {
      body.password = password
      body.passwordHint = passwordHint.trim() || null
    }

    if (accessType === 'PAID') {
      body.price = Number(price)
    }

    const url = mode === 'new' ? '/api/houtai/articles' : `/api/houtai/articles/${articleId}`
    const method = mode === 'new' ? 'POST' : 'PUT'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      let data: Record<string, unknown> | null = null
      try {
        data = await res.json()
      } catch {
        data = null
      }

      if (!res.ok) {
        setError(String(data?.error || '保存失败'))
        setStatus('error')
        return
      }

      router.push('/houtai/articles')
      router.refresh()
    } catch (err) {
      console.error('[ArticleForm] submit failed:', err)
      setError('保存失败，请检查网络或服务器状态')
      setStatus('error')
    } finally {
      setStatus(current => current === 'error' ? 'error' : 'idle')
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6 max-w-3xl">
      <div>
        <label className="text-xs text-[#8c7d68] mb-1 block">文章标题 *</label>
        <input
          className="input text-lg font-serif"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="写下今天的主题…"
        />
      </div>

      <CoverPicker value={coverImage} onChange={setCoverImage} />

      <div>
        <label className="text-xs text-[#8c7d68] mb-2 block">今天的心情</label>
        <div className="flex flex-wrap gap-2">
          {MOODS.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => setMood(option.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-all ${
                mood === option.value
                  ? 'border-[#d4711a] bg-[#fdf6ee] text-[#d4711a]'
                  : 'border-[#ddd5c8] text-[#5a4f42] hover:border-[#d4711a]'
              }`}
            >
              <span>{option.value}</span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-[#8c7d68] mb-2 block">访问类型</label>
        <div className="flex gap-3">
          {[
            { value: 'PUBLIC', label: '🌐 公开', desc: '所有人可见' },
            { value: 'PASSWORD', label: '🔒 加密', desc: '需要密码' },
            { value: 'PAID', label: '💰 打赏', desc: '需要打赏' },
          ].map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => setAccessType(option.value as 'PUBLIC' | 'PASSWORD' | 'PAID')}
              className={`flex-1 p-3 rounded-lg border text-left transition-all ${
                accessType === option.value
                  ? 'border-[#d4711a] bg-[#fdf6ee]'
                  : 'border-[#ddd5c8] hover:border-[#d4711a]'
              }`}
            >
              <div className="text-sm font-medium text-[#3d3530]">{option.label}</div>
              <div className="text-xs text-[#a89880] mt-0.5">{option.desc}</div>
            </button>
          ))}
        </div>

        {accessType === 'PASSWORD' && (
          <div className="mt-3 space-y-3">
            <div>
              <label className="text-xs text-[#8c7d68] mb-1 block">访问密码 *</label>
              <input
                type="password"
                className="input max-w-xs"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="设置一个密码"
              />
            </div>
            <div>
              <label className="text-xs text-[#8c7d68] mb-1 block">
                密码提示 <span className="text-[#c4b8a7]">（可选，明文展示给访客，勿填密码本身）</span>
              </label>
              <input
                type="text"
                className="input max-w-xs"
                value={passwordHint}
                onChange={e => setPasswordHint(e.target.value)}
                placeholder="例如：我们初次见面的城市"
                maxLength={60}
              />
            </div>
          </div>
        )}

        {accessType === 'PAID' && (
          <div className="mt-3">
            <label className="text-xs text-[#8c7d68] mb-1 block">打赏金额（元）*</label>
            <div className="flex items-center gap-2 max-w-xs">
              <span className="text-[#8c7d68] text-sm">¥</span>
              <input
                type="number"
                className="input"
                min="1"
                step="0.5"
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="5"
              />
            </div>
          </div>
        )}
      </div>

      <div>
        {!preview && (
          <MediaToolbar
            onInsert={insertAtCursor}
            onWrapSelection={wrapSelection}
            onApplyStyleBlock={applyStyleBlock}
          />
        )}

        {preview ? (
          <div className="border border-[#ddd5c8] rounded-2xl p-6 min-h-[400px] bg-white">
            <div className="mb-4 rounded-xl bg-[#faf8f5] px-4 py-2 text-xs text-[#8c7d68]">
              预览模式下不显示编辑工具栏，切回编辑后可继续使用标题、加粗、字体、字号、颜色和媒体插入功能。
            </div>
            <RichMarkdown content={content || '在这里预览你的文章效果…'} />
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            className="input markdown-editor font-mono text-sm"
            value={content}
          onChange={e => setContent(e.target.value)}
          onSelect={rememberSelection}
          onKeyUp={rememberSelection}
          onMouseUp={rememberSelection}
          onFocus={rememberSelection}
          placeholder={`# 文章标题\n\n这里支持 Markdown，也支持工具栏插入的段落样式和视频语法。`}
        />
        )}

        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-[#c4b8a7]">支持 Markdown、段落样式、图片和视频插入</p>
          <button type="button" onClick={() => setPreview(current => !current)} className="text-xs text-[#d4711a] hover:underline">
            {preview ? '继续编辑' : '预览效果'}
          </button>
        </div>
      </div>

      <div className="grid gap-3 p-4 bg-[#faf8f5] border border-[#ddd5c8] rounded-lg sm:grid-cols-2">
        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={published}
              onChange={e => setPublished(e.target.checked)}
            />
            <div className="w-10 h-5 bg-[#ddd5c8] peer-checked:bg-[#d4711a] rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
          </label>
          <div>
            <p className="text-sm font-medium text-[#3d3530]">{published ? '立即发布' : '保存为草稿'}</p>
            <p className="text-xs text-[#a89880]">{published ? '文章将对访客可见' : '仅在后台可见'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={pinned}
              onChange={e => setPinned(e.target.checked)}
            />
            <div className="w-10 h-5 bg-[#ddd5c8] peer-checked:bg-[#221e1a] rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
          </label>
          <div>
            <p className="text-sm font-medium text-[#3d3530]">{pinned ? '已置顶展示' : '普通顺序'}</p>
            <p className="text-xs text-[#a89880]">{pinned ? '会优先展示在文章列表顶部' : '按发布时间排序显示'}</p>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary" disabled={status === 'loading'}>
          {status === 'loading' ? '保存中…' : mode === 'new' ? '发布文章' : '保存修改'}
        </button>
        <button type="button" className="btn-secondary" onClick={() => router.back()}>
          取消
        </button>
      </div>
    </form>
  )
}
