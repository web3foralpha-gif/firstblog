'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MOODS } from '@/lib/utils'
import RichTextEditor from './RichTextEditor'
import CoverPicker from './CoverPicker'
import RichMarkdown from '@/components/blog/RichMarkdown'
import { hasMeaningfulArticleContent } from '@/lib/article-content'
import { analyzeWritingIssues } from '@/lib/writing-check'

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

type AccessType = 'PUBLIC' | 'PASSWORD' | 'PAID'

type ArticleDraftSnapshot = {
  title: string
  content: string
  mood: string
  coverImage: string
  accessType: AccessType
  password: string
  passwordHint: string
  price: string
  pinned: boolean
  published: boolean
  savedAt: number
}

type ArticleContentMetrics = {
  textLength: number
  blockCount: number
  imageCount: number
  videoCount: number
  audioCount: number
}

function buildDraftStorageKey(mode: ArticleFormProps['mode'], articleId?: string) {
  return `blog-fix:article-draft:${mode}:${articleId || 'new'}`
}

function buildDraftHistoryStorageKey(mode: ArticleFormProps['mode'], articleId?: string) {
  return `blog-fix:article-draft-history:${mode}:${articleId || 'new'}`
}

function serializeDraftComparable(draft: Omit<ArticleDraftSnapshot, 'savedAt'> | ArticleDraftSnapshot) {
  return JSON.stringify({
    title: draft.title,
    content: draft.content,
    mood: draft.mood,
    coverImage: draft.coverImage,
    accessType: draft.accessType,
    password: draft.password,
    passwordHint: draft.passwordHint,
    price: draft.price,
    pinned: draft.pinned,
    published: draft.published,
  })
}

function normalizeDraft(raw: unknown): ArticleDraftSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null

  const source = raw as Record<string, unknown>
  const accessType = source.accessType === 'PASSWORD' || source.accessType === 'PAID' ? source.accessType : 'PUBLIC'

  return {
    title: typeof source.title === 'string' ? source.title : '',
    content: typeof source.content === 'string' ? source.content : '',
    mood: typeof source.mood === 'string' ? source.mood : '😊',
    coverImage: typeof source.coverImage === 'string' ? source.coverImage : '',
    accessType,
    password: typeof source.password === 'string' ? source.password : '',
    passwordHint: typeof source.passwordHint === 'string' ? source.passwordHint : '',
    price: typeof source.price === 'string' ? source.price : '5',
    pinned: Boolean(source.pinned),
    published: source.published === undefined ? true : Boolean(source.published),
    savedAt: typeof source.savedAt === 'number' ? source.savedAt : Date.now(),
  }
}

function normalizeDraftHistory(raw: unknown) {
  if (!Array.isArray(raw)) return []
  return raw.map(normalizeDraft).filter(Boolean) as ArticleDraftSnapshot[]
}

const DRAFT_HISTORY_LIMIT = 6
const DRAFT_HISTORY_MIN_INTERVAL = 45_000

function analyzeArticleContentMetrics(value: string): ArticleContentMetrics {
  const source = value || ''
  const plainText = source
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, '')
    .trim()

  const blockCount =
    (source.match(/<(p|h2|h3|blockquote|li)\b/gi) || []).length ||
    (plainText ? 1 : 0)

  return {
    textLength: plainText.length,
    blockCount,
    imageCount: (source.match(/<img\b/gi) || []).length,
    videoCount: (source.match(/<video\b/gi) || []).length,
    audioCount: (source.match(/<audio\b/gi) || []).length,
  }
}

function formatDraftTime(value: number | null) {
  if (!value) return '暂无'

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export default function ArticleForm({ mode, articleId, defaultValues }: ArticleFormProps) {
  const router = useRouter()
  const d = defaultValues
  const initialContent = d?.content || ''
  const formRef = useRef<HTMLFormElement>(null)
  const [title, setTitle] = useState(d?.title || '')
  const [content, setContent] = useState(initialContent)
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
  const [autosaveState, setAutosaveState] = useState<'idle' | 'dirty' | 'saving' | 'saved' | 'restored'>('idle')
  const [autosavedAt, setAutosavedAt] = useState<number | null>(null)
  const [recoverableDraft, setRecoverableDraft] = useState<ArticleDraftSnapshot | null>(null)
  const [draftHistory, setDraftHistory] = useState<ArticleDraftSnapshot[]>([])
  const contentRef = useRef(initialContent)
  const autosaveTimerRef = useRef<number | null>(null)
  const hasMountedRef = useRef(false)
  const initialDraftComparableRef = useRef(
    serializeDraftComparable({
      title: d?.title || '',
      content: initialContent,
      mood: d?.mood || '😊',
      coverImage: d?.coverImage || '',
      accessType: (d?.accessType || 'PUBLIC') as AccessType,
      password: d?.password || '',
      passwordHint: d?.passwordHint || '',
      price: d?.price ? String(d.price) : '5',
      pinned: d?.pinned ?? false,
      published: d?.published ?? true,
    }),
  )
  const draftStorageKey = useMemo(() => buildDraftStorageKey(mode, articleId), [articleId, mode])
  const draftHistoryStorageKey = useMemo(() => buildDraftHistoryStorageKey(mode, articleId), [articleId, mode])

  const syncContentState = useCallback(() => {
    setContent(current => (current === contentRef.current ? current : contentRef.current))
  }, [])

  const clearAutosaveTimer = useCallback(() => {
    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current)
      autosaveTimerRef.current = null
    }
  }, [])

  const buildCurrentDraft = useCallback(
    (savedAt = Date.now()): ArticleDraftSnapshot => ({
      title,
      content: contentRef.current,
      mood,
      coverImage,
      accessType,
      password,
      passwordHint,
      price,
      pinned,
      published,
      savedAt,
    }),
    [accessType, coverImage, mood, password, passwordHint, pinned, price, published, title],
  )

  const clearDraftStorage = useCallback(() => {
    if (typeof window === 'undefined') return
    clearAutosaveTimer()
    window.localStorage.removeItem(draftStorageKey)
    window.localStorage.removeItem(draftHistoryStorageKey)
    setAutosaveState('idle')
    setAutosavedAt(null)
    setRecoverableDraft(null)
    setDraftHistory([])
  }, [clearAutosaveTimer, draftHistoryStorageKey, draftStorageKey])

  const persistDraftToLocal = useCallback(() => {
    if (typeof window === 'undefined') return

    const nextDraft = buildCurrentDraft()
    const comparable = serializeDraftComparable(nextDraft)

    if (comparable === initialDraftComparableRef.current) {
      clearDraftStorage()
      return
    }

    setAutosaveState('saving')
    window.localStorage.setItem(draftStorageKey, JSON.stringify(nextDraft))
    try {
      const history = normalizeDraftHistory(JSON.parse(window.localStorage.getItem(draftHistoryStorageKey) || '[]'))
      const latest = history[0]
      const shouldCreateSnapshot =
        !latest ||
        (serializeDraftComparable(latest) !== comparable &&
          (nextDraft.savedAt - latest.savedAt >= DRAFT_HISTORY_MIN_INTERVAL ||
            Math.abs(nextDraft.content.length - latest.content.length) >= 180 ||
            nextDraft.title !== latest.title))

      const nextHistory = shouldCreateSnapshot
        ? [nextDraft, ...history].slice(0, DRAFT_HISTORY_LIMIT)
        : history

      window.localStorage.setItem(draftHistoryStorageKey, JSON.stringify(nextHistory))
      setDraftHistory(nextHistory)
    } catch {
      window.localStorage.removeItem(draftHistoryStorageKey)
      setDraftHistory([])
    }
    setAutosavedAt(nextDraft.savedAt)
    setAutosaveState('saved')
  }, [buildCurrentDraft, clearDraftStorage, draftHistoryStorageKey, draftStorageKey])

  const scheduleAutosave = useCallback(() => {
    if (typeof window === 'undefined' || !hasMountedRef.current) return

    clearAutosaveTimer()
    setAutosaveState(current => (current === 'dirty' || current === 'saving' ? current : 'dirty'))
    autosaveTimerRef.current = window.setTimeout(() => {
      persistDraftToLocal()
    }, 1200)
  }, [clearAutosaveTimer, persistDraftToLocal])

  const handleContentChange = useCallback(
    (nextValue: string) => {
      contentRef.current = nextValue
      scheduleAutosave()
    },
    [scheduleAutosave],
  )

  function applyDraft(snapshot: ArticleDraftSnapshot) {
    setTitle(snapshot.title)
    setContent(snapshot.content)
    contentRef.current = snapshot.content
    setMood(snapshot.mood)
    setCoverImage(snapshot.coverImage)
    setAccessType(snapshot.accessType)
    setPassword(snapshot.password)
    setPasswordHint(snapshot.passwordHint)
    setPrice(snapshot.price)
    setPinned(snapshot.pinned)
    setPublished(snapshot.published)
    setAutosavedAt(snapshot.savedAt)
    setAutosaveState('restored')
    setRecoverableDraft(null)
  }

  const hasUnsavedChanges = useCallback(() => {
    if (status === 'loading') return true

    const comparable = serializeDraftComparable(buildCurrentDraft(autosavedAt ?? Date.now()))
    return comparable !== initialDraftComparableRef.current
  }, [autosavedAt, buildCurrentDraft, status])

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const raw = window.localStorage.getItem(draftStorageKey)
      if (raw) {
        const parsed = normalizeDraft(JSON.parse(raw))
        if (parsed) {
          const comparable = serializeDraftComparable(parsed)
          if (comparable !== initialDraftComparableRef.current) {
            setRecoverableDraft(parsed)
            setAutosavedAt(parsed.savedAt)
          } else {
            window.localStorage.removeItem(draftStorageKey)
          }
        } else {
          window.localStorage.removeItem(draftStorageKey)
        }
      }
      const historyRaw = window.localStorage.getItem(draftHistoryStorageKey)
      if (historyRaw) {
        setDraftHistory(normalizeDraftHistory(JSON.parse(historyRaw)))
      }
    } catch {
      window.localStorage.removeItem(draftStorageKey)
      window.localStorage.removeItem(draftHistoryStorageKey)
    } finally {
      hasMountedRef.current = true
    }

    return () => {
      clearAutosaveTimer()
    }
  }, [clearAutosaveTimer, draftHistoryStorageKey, draftStorageKey])

  useEffect(() => {
    if (!hasMountedRef.current) return
    scheduleAutosave()
  }, [accessType, coverImage, mood, password, passwordHint, pinned, price, published, scheduleAutosave, title])

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges()) return

      persistDraftToLocal()
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges, persistDraftToLocal])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const flushWhenHidden = () => {
      if (!hasMountedRef.current || !hasUnsavedChanges()) return
      persistDraftToLocal()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushWhenHidden()
      }
    }

    window.addEventListener('pagehide', flushWhenHidden)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      window.removeEventListener('pagehide', flushWhenHidden)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [hasUnsavedChanges, persistDraftToLocal])

  useEffect(() => {
    const handleDocumentNavigation = (event: MouseEvent) => {
      if (!hasUnsavedChanges()) return
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const target = event.target
      if (!(target instanceof Element)) return

      const anchor = target.closest('a[href]') as HTMLAnchorElement | null
      if (!anchor) return
      if (anchor.hasAttribute('download')) return

      const href = anchor.getAttribute('href')
      const targetAttr = anchor.getAttribute('target')
      if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return
      }
      if (targetAttr && targetAttr !== '_self') return

      const currentUrl = new URL(window.location.href)
      const nextUrl = new URL(anchor.href, currentUrl)
      if (nextUrl.origin !== currentUrl.origin) return
      if (
        nextUrl.pathname === currentUrl.pathname &&
        nextUrl.search === currentUrl.search &&
        nextUrl.hash === currentUrl.hash
      ) {
        return
      }

      if (!window.confirm('当前改动还没有正式保存到后台，确定离开当前编辑页吗？')) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    document.addEventListener('click', handleDocumentNavigation, true)
    return () => document.removeEventListener('click', handleDocumentNavigation, true)
  }, [hasUnsavedChanges])

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 's') return
      if (status === 'loading') return

      event.preventDefault()
      formRef.current?.requestSubmit()
    }

    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [status])

  const autosaveLabel = useMemo(() => {
    if (status === 'loading') return '正在保存到后台…'
    if (recoverableDraft) return '检测到上次未完成的本地草稿'
    if (autosaveState === 'saving') return '正在自动暂存到当前浏览器…'
    if (autosaveState === 'dirty') return '检测到改动，稍后自动暂存'
    if ((autosaveState === 'saved' || autosaveState === 'restored') && autosavedAt) {
      const time = new Intl.DateTimeFormat('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date(autosavedAt))
      return `${autosaveState === 'restored' ? '已恢复' : '已自动暂存'} · ${time}`
    }
    return '自动暂存仅保存在当前浏览器，正式发布前仍建议手动保存'
  }, [autosaveState, autosavedAt, recoverableDraft, status])
  const currentContentValue = contentRef.current || content
  const contentMetrics = analyzeArticleContentMetrics(currentContentValue)
  const writingIssues = useMemo(
    () => analyzeWritingIssues({ title, content: currentContentValue }),
    [currentContentValue, title],
  )
  const warningIssues = writingIssues.filter(issue => issue.level === 'warning')
  const unsavedChanges = hasUnsavedChanges()
  const accessSummary =
    accessType === 'PASSWORD'
      ? '加密访问'
      : accessType === 'PAID'
        ? `付费阅读 · ¥${price || '5'}`
        : '公开可见'
  const estimatedReadMinutes = Math.max(1, Math.ceil(contentMetrics.textLength / 380))
  const hasHeadingStructure = /<h2\b|<h3\b/i.test(currentContentValue)
  const hasStyledBlocks = /class="[^"]*rt-(eyebrow|lead|summary|guide|caption|note|tip|warning|quote|closing)/i.test(currentContentValue)
  const hasMediaAssets = Boolean(coverImage) || contentMetrics.imageCount + contentMetrics.videoCount + contentMetrics.audioCount > 0
  const writingSignals = [
    {
      label: '标题',
      ready: Boolean(title.trim()),
      hint: title.trim() ? '主题已明确' : '还需要一个清楚的标题',
    },
    {
      label: '结构',
      ready: hasHeadingStructure,
      hint: hasHeadingStructure ? '已经有章节层次' : '建议插入 H2 / H3',
    },
    {
      label: '排版',
      ready: hasStyledBlocks,
      hint: hasStyledBlocks ? '已有导语或卡片样式' : '可以加导语、信息卡、金句',
    },
    {
      label: '媒体',
      ready: hasMediaAssets,
      hint: hasMediaAssets ? '封面或正文媒体已就位' : '可补一张封面或配图',
    },
  ]

  function handleCancel() {
    if (hasUnsavedChanges() && !window.confirm('当前改动还没有正式保存到后台，确定现在离开吗？')) {
      return
    }

    router.back()
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const currentContent = contentRef.current

    if (!title.trim() || !hasMeaningfulArticleContent(currentContent)) {
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
      content: currentContent.trim(),
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

      clearDraftStorage()
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
    <form ref={formRef} onSubmit={submit} className="mx-auto max-w-7xl space-y-6">
      {recoverableDraft ? (
        <div className="rounded-2xl border border-[#f2d1a7] bg-[#fff8ef] px-4 py-3 text-sm text-[#7b5b35]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">检测到一份未完成的本地草稿</p>
              <p className="mt-1 text-xs text-[#9a7750]">
                最近暂存时间：
                {new Date(recoverableDraft.savedAt).toLocaleString('zh-CN', {
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                。你可以恢复继续编辑，或忽略它并从当前版本开始。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => applyDraft(recoverableDraft)} className="btn-primary">
                恢复草稿
              </button>
              <button type="button" onClick={clearDraftStorage} className="btn-secondary">
                忽略草稿
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <section className="rounded-[32px] border border-[#eadfce] bg-[linear-gradient(180deg,#fffdf9,#faf6ef)] px-5 py-5 shadow-[0_18px_40px_rgba(61,53,48,0.05)] sm:px-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#b1997f]">Editor Desk</p>
            <h2 className="mt-2 font-serif text-2xl text-[#2f2924]">{mode === 'new' ? '新建文章工作台' : '文章编辑工作台'}</h2>
            <p className="mt-2 text-sm leading-7 text-[#7a6a56]">
              这里把标题、封面、访问方式、正文排版和发布状态收进同一处，方便你一边写，一边把文章磨成成稿。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#eadfce] bg-white px-3 py-1.5 text-xs text-[#8c7d68]">{accessSummary}</span>
            <span className="rounded-full border border-[#eadfce] bg-white px-3 py-1.5 text-xs text-[#8c7d68]">
              {published ? '准备发布' : '后台草稿'}
            </span>
            <span className="rounded-full border border-[#eadfce] bg-white px-3 py-1.5 text-xs text-[#8c7d68]">
              预计阅读 {estimatedReadMinutes} 分钟
            </span>
            <button
              type="button"
              onClick={() => {
                if (!preview) {
                  syncContentState()
                }
                setPreview(current => !current)
              }}
              className="rounded-full border border-[#decfb8] bg-white px-3 py-1.5 text-xs text-[#8c7d68] transition hover:border-[#d4711a] hover:text-[#d4711a]"
            >
              {preview ? '切回编辑' : '预览成稿'}
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-[#eadfce] bg-white/90 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#b1997f]">文字长度</p>
            <p className="mt-2 text-2xl font-semibold text-[#3d3530]">{contentMetrics.textLength}</p>
            <p className="mt-1 text-xs text-[#8c7d68]">建议长文保持稳定节奏，别一下写太满</p>
          </div>
          <div className="rounded-2xl border border-[#eadfce] bg-white/90 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#b1997f]">段落结构</p>
            <p className="mt-2 text-2xl font-semibold text-[#3d3530]">{contentMetrics.blockCount}</p>
            <p className="mt-1 text-xs text-[#8c7d68]">{hasHeadingStructure ? '已有标题层次' : '可以补 1-2 个小标题'}</p>
          </div>
          <div className="rounded-2xl border border-[#eadfce] bg-white/90 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#b1997f]">媒体素材</p>
            <p className="mt-2 text-2xl font-semibold text-[#3d3530]">
              {contentMetrics.imageCount + contentMetrics.videoCount + contentMetrics.audioCount}
            </p>
            <p className="mt-1 text-xs text-[#8c7d68]">
              图 {contentMetrics.imageCount} / 视 {contentMetrics.videoCount} / 音 {contentMetrics.audioCount}
            </p>
          </div>
          <div className="rounded-2xl border border-[#eadfce] bg-white/90 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#b1997f]">本地暂存</p>
            <p className="mt-2 text-lg font-semibold text-[#3d3530]">{recoverableDraft ? '待恢复草稿' : formatDraftTime(autosavedAt)}</p>
            <p className="mt-1 text-xs text-[#8c7d68]">{unsavedChanges ? '还有未保存改动' : '当前内容已对齐'}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {writingSignals.map(item => (
            <div
              key={item.label}
              className={`rounded-2xl border px-4 py-3 text-sm ${
                item.ready ? 'border-[#cfe7d5] bg-[#f4fbf6] text-[#2f6b3d]' : 'border-[#eadfce] bg-white text-[#7a6a56]'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">{item.label}</span>
                <span className="text-xs">{item.ready ? '已就绪' : '待补充'}</span>
              </div>
              <p className="mt-1 text-xs leading-5 opacity-80">{item.hint}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_340px]">
        <div className="space-y-6">
          <section className="rounded-[28px] border border-[#eadfce] bg-white px-5 py-5 shadow-[0_14px_32px_rgba(61,53,48,0.04)] sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0 flex-1">
                <label className="mb-2 block text-xs text-[#8c7d68]">文章标题 *</label>
              <input
                className="input text-lg font-serif"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="写下今天的主题…"
                spellCheck
              />
              </div>
              <div className="rounded-2xl border border-[#f0e4d3] bg-[#faf7f1] px-4 py-3 text-xs leading-6 text-[#8c7d68] lg:max-w-[18rem]">
                标题尽量让人一眼知道你要写什么。真一点，短一点，后面正文就更容易稳住。
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-[#eadfce] bg-white px-5 py-5 shadow-[0_14px_32px_rgba(61,53,48,0.04)] sm:px-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#b1997f]">Cover</p>
                <h3 className="mt-1 text-lg font-semibold text-[#3d3530]">封面与视觉入口</h3>
              </div>
              <span className="rounded-full bg-[#faf7f1] px-3 py-1 text-xs text-[#8c7d68]">{coverImage ? '已设置封面' : '暂未设置'}</span>
            </div>
            <CoverPicker value={coverImage} onChange={setCoverImage} />
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-[28px] border border-[#eadfce] bg-white px-5 py-5 shadow-[0_14px_32px_rgba(61,53,48,0.04)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#b1997f]">Mood</p>
            <h3 className="mt-1 text-lg font-semibold text-[#3d3530]">今天的心情</h3>
            <p className="mt-1 text-xs leading-5 text-[#8c7d68]">心情会直接影响文章列表里的第一印象。</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {MOODS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setMood(option.value)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-all ${
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
          </section>

          <section className="rounded-[28px] border border-[#eadfce] bg-white px-5 py-5 shadow-[0_14px_32px_rgba(61,53,48,0.04)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#b1997f]">Access</p>
            <h3 className="mt-1 text-lg font-semibold text-[#3d3530]">访问方式</h3>
            <div className="mt-4 space-y-3">
              {[
                { value: 'PUBLIC', label: '🌐 公开', desc: '所有人可见' },
                { value: 'PASSWORD', label: '🔒 加密', desc: '需要密码' },
                { value: 'PAID', label: '💰 打赏', desc: '需要打赏' },
              ].map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setAccessType(option.value as 'PUBLIC' | 'PASSWORD' | 'PAID')}
                  className={`block w-full rounded-2xl border p-3 text-left transition-all ${
                    accessType === option.value
                      ? 'border-[#d4711a] bg-[#fdf6ee]'
                      : 'border-[#ddd5c8] hover:border-[#d4711a]'
                  }`}
                >
                  <div className="text-sm font-medium text-[#3d3530]">{option.label}</div>
                  <div className="mt-0.5 text-xs text-[#a89880]">{option.desc}</div>
                </button>
              ))}
            </div>

            {accessType === 'PASSWORD' && (
              <div className="mt-4 space-y-3 rounded-2xl bg-[#faf7f1] p-4">
                <div>
                  <label className="mb-1 block text-xs text-[#8c7d68]">访问密码 *</label>
                  <input
                    type="password"
                    className="input"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="设置一个密码"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#8c7d68]">
                    密码提示 <span className="text-[#c4b8a7]">（可选，明文展示给访客，勿填密码本身）</span>
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={passwordHint}
                    onChange={e => setPasswordHint(e.target.value)}
                    placeholder="例如：我们初次见面的城市"
                    maxLength={60}
                  />
                </div>
              </div>
            )}

            {accessType === 'PAID' && (
              <div className="mt-4 rounded-2xl bg-[#faf7f1] p-4">
                <label className="mb-1 block text-xs text-[#8c7d68]">打赏金额（元）*</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#8c7d68]">¥</span>
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
          </section>

          <section className="rounded-[28px] border border-[#eadfce] bg-white px-5 py-5 shadow-[0_14px_32px_rgba(61,53,48,0.04)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#b1997f]">Publish</p>
            <h3 className="mt-1 text-lg font-semibold text-[#3d3530]">发布节奏</h3>
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-3">
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={published}
                    onChange={e => setPublished(e.target.checked)}
                  />
                  <div className="h-5 w-10 rounded-full bg-[#ddd5c8] transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#d4711a] peer-checked:after:translate-x-5" />
                </label>
                <div>
                  <p className="text-sm font-medium text-[#3d3530]">{published ? '立即发布' : '保存为草稿'}</p>
                  <p className="text-xs text-[#a89880]">{published ? '文章会对访客可见' : '先留在后台继续修改'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={pinned}
                    onChange={e => setPinned(e.target.checked)}
                  />
                  <div className="h-5 w-10 rounded-full bg-[#ddd5c8] transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#221e1a] peer-checked:after:translate-x-5" />
                </label>
                <div>
                  <p className="text-sm font-medium text-[#3d3530]">{pinned ? '已置顶展示' : '普通顺序'}</p>
                  <p className="text-xs text-[#a89880]">{pinned ? '会优先显示在文章列表顶部' : '按发布时间排序'}</p>
                </div>
              </div>
            </div>
          </section>
        </aside>
      </div>

      <section className="rounded-[32px] border border-[#eadfce] bg-white px-5 py-5 shadow-[0_18px_36px_rgba(61,53,48,0.05)] sm:px-6">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#b1997f]">Writing</p>
            <h3 className="mt-1 text-xl font-semibold text-[#3d3530]">正文编辑区</h3>
            <p className="mt-1 text-sm leading-6 text-[#8c7d68]">
              这里适合直接完成正文成稿。先用导语稳住开头，再插章节、小卡片和结尾，文章会更像完整作品。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#faf7f1] px-3 py-1.5 text-xs text-[#8c7d68]">{preview ? '当前为预览模式' : '当前为编辑模式'}</span>
            <span className="rounded-full bg-[#faf7f1] px-3 py-1.5 text-xs text-[#8c7d68]">快捷键：Ctrl/Cmd + S</span>
          </div>
        </div>

        {!preview && <RichTextEditor value={content} onChange={handleContentChange} />}

        {preview ? (
          <div className="border border-[#ddd5c8] rounded-2xl p-6 min-h-[400px] bg-white">
            <div className="mb-4 rounded-xl bg-[#faf8f5] px-4 py-2 text-xs text-[#8c7d68]">
              预览模式下不显示工具栏，切回编辑后可继续使用公众号风格的排版、模板、首行缩进、段落间距以及图片视频音频插入。
            </div>
            {coverImage && (
              <div className="mb-6 overflow-hidden rounded-3xl border border-[#eadfce] bg-[#faf8f5]">
                <img src={coverImage} alt={title || '文章封面'} className="block aspect-[16/9] w-full object-cover" />
              </div>
            )}
            <RichMarkdown content={content || '在这里预览你的文章效果…'} />
          </div>
        ) : (
          <div className="rounded-xl bg-[#faf8f5] px-4 py-2 text-xs text-[#8c7d68]">
            正在使用新版富文本编辑器。旧文章会自动转成可编辑排版，新发布文章将按 HTML 富文本保存。
          </div>
        )}

        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-[#c4b8a7]">支持导语、摘要引导、图文段落、问答片段、信息卡、金句、图注、收尾段、标题、颜色高亮、首行缩进、段前段后、格式刷与多媒体插入</p>
          <button
            type="button"
            onClick={() => {
              if (!preview) {
                syncContentState()
              }
              setPreview(current => !current)
            }}
            className="text-xs text-[#d4711a] hover:underline"
          >
            {preview ? '继续编辑' : '预览效果'}
          </button>
        </div>
      </section>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#b1997f]">Review</p>
            <h3 className="mt-1 text-lg font-semibold text-[#3d3530]">发布前检查</h3>
          </div>
          <p className="text-xs text-[#8c7d68]">发出去之前，再看一眼字数、媒体、状态和本地暂存是否都对得上。</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-[#eadfce] bg-white px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#b1997f]">正文长度</p>
            <p className="mt-2 text-2xl font-semibold text-[#3d3530]">{contentMetrics.textLength}</p>
            <p className="mt-1 text-xs text-[#8c7d68]">约 {contentMetrics.blockCount} 个内容段落</p>
          </div>
          <div className="rounded-2xl border border-[#eadfce] bg-white px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#b1997f]">媒体内容</p>
            <p className="mt-2 text-2xl font-semibold text-[#3d3530]">
              {contentMetrics.imageCount + contentMetrics.videoCount + contentMetrics.audioCount}
            </p>
            <p className="mt-1 text-xs text-[#8c7d68]">
              图 {contentMetrics.imageCount} / 视 {contentMetrics.videoCount} / 音 {contentMetrics.audioCount}
            </p>
          </div>
          <div className="rounded-2xl border border-[#eadfce] bg-white px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#b1997f]">发布状态</p>
            <p className="mt-2 text-lg font-semibold text-[#3d3530]">{published ? '准备发布' : '后台草稿'}</p>
            <p className="mt-1 text-xs text-[#8c7d68]">{accessSummary}</p>
          </div>
          <div className="rounded-2xl border border-[#eadfce] bg-white px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#b1997f]">本地暂存</p>
            <p className="mt-2 text-lg font-semibold text-[#3d3530]">{recoverableDraft ? '待恢复草稿' : formatDraftTime(autosavedAt)}</p>
            <p className="mt-1 text-xs text-[#8c7d68]">
              {coverImage ? '已设置封面图' : '未设置封面图'} · {unsavedChanges ? '仍有未保存改动' : '当前内容已对齐'}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#eadfce] bg-[#faf8f5] px-4 py-3 text-xs text-[#8c7d68]">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <span className="block">{autosaveLabel}</span>
              <span className="block text-[#b1997f]">切到后台、刷新页面、关闭标签页前都会优先补存一份本地草稿，突发断网也能恢复。</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(recoverableDraft || autosavedAt) ? (
                <button
                  type="button"
                  onClick={clearDraftStorage}
                  className="rounded-full border border-[#decfb8] bg-white px-3 py-1.5 text-[11px] text-[#8c7d68] transition hover:border-[#d4711a] hover:text-[#d4711a]"
                >
                  清空当前浏览器草稿
                </button>
              ) : null}
              <span className="text-[#b1997f]">快捷键：Ctrl/Cmd + S 立即保存</span>
            </div>
          </div>
        </div>

        {draftHistory.length > 0 ? (
          <div className="rounded-2xl border border-[#eadfce] bg-white px-4 py-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#b1997f]">草稿历史</p>
                <p className="mt-1 text-sm font-medium text-[#3d3530]">最近自动保存的版本</p>
              </div>
              <p className="text-xs text-[#8c7d68]">保留最近 {draftHistory.length} 份关键节点，写到一半出意外也能找回来。</p>
            </div>

            <div className="mt-3 space-y-2">
              {draftHistory.slice(0, 4).map(snapshot => (
                <button
                  key={`${snapshot.savedAt}-${snapshot.title}`}
                  type="button"
                  onClick={() => applyDraft(snapshot)}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[#efe5d7] bg-[#fcfaf7] px-4 py-3 text-left transition hover:border-[#d4711a] hover:bg-[#fff8f1]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#3d3530]">{snapshot.title || '未命名草稿'}</p>
                    <p className="mt-1 text-xs text-[#8c7d68]">
                      {formatDraftTime(snapshot.savedAt)} · 约 {Math.max(1, Math.ceil(snapshot.content.length / 220))} 分钟写作量
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-[#b1997f]">恢复这个版本</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className={`rounded-2xl border px-4 py-4 ${warningIssues.length > 0 ? 'border-[#f2d1a7] bg-[#fff8ef]' : 'border-[#d9ead7] bg-[#f6fbf5]'}`}>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#b1997f]">校对提醒</p>
              <p className="mt-1 text-sm font-medium text-[#3d3530]">
                {writingIssues.length > 0 ? `检测到 ${writingIssues.length} 条基础写作提醒` : '暂时没扫到明显的格式问题'}
              </p>
            </div>
            <p className="text-xs text-[#8c7d68]">这是基础校对，不一定都是真错字，但能帮你先把明显问题拎出来。</p>
          </div>

          {writingIssues.length > 0 ? (
            <div className="mt-3 space-y-2">
              {writingIssues.map(issue => (
                <div
                  key={issue.id}
                  className={`rounded-2xl border px-4 py-3 ${issue.level === 'warning' ? 'border-[#f0d4ad] bg-white/90' : 'border-[#e7ded0] bg-white/80'}`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] ${issue.level === 'warning' ? 'bg-[#fff1df] text-[#b26114]' : 'bg-[#f4f1eb] text-[#8c7d68]'}`}>
                      {issue.level === 'warning' ? '优先看看' : '可顺手处理'}
                    </span>
                    <span className="text-sm font-medium text-[#3d3530]">{issue.title}</span>
                  </div>
                  <p className="mt-1 text-xs leading-6 text-[#7a6a56]">{issue.detail}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-[#5d7a5a]">标题、标点和基础格式暂时都还顺。发出去之前再自己通读一遍，就更稳了。</p>
          )}
        </div>
      </section>

      <div className="flex flex-wrap gap-3 pt-2">
        <button type="submit" className="btn-primary" disabled={status === 'loading'}>
          {status === 'loading' ? '保存中…' : mode === 'new' ? '发布文章' : '保存修改'}
        </button>
        <button type="button" className="btn-secondary" onClick={handleCancel}>
          取消
        </button>
      </div>
    </form>
  )
}
