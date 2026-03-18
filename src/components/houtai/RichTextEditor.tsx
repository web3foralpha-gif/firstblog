'use client'

import type { ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import Quill from 'quill'
import type { EmitterSource, Range } from 'quill'
import FileUploader from './FileUploader'
import {
  hasMeaningfulArticleContent,
  isRichHtmlContent,
  legacyArticleToHtml,
  sanitizeArticleHtml,
} from '@/lib/article-content'

type RichTextEditorProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

type ToolbarButtonProps = {
  label: string
  title: string
  active?: boolean
  onClick: () => void
  children: ReactNode
}

type BrushState = {
  active: boolean
  formats: Record<string, unknown> | null
  sourceRange: Range | null
}

type PreferredInlineFormats = Partial<Record<InlinePreferenceKey, string>>

const FONT_OPTIONS = [
  { value: '', label: '默认字体' },
  { value: 'serif', label: '衬线' },
  { value: 'sans', label: '无衬线' },
  { value: 'song', label: '宋体' },
  { value: 'hei', label: '黑体' },
  { value: 'mono', label: '等宽' },
] as const

const SIZE_OPTIONS = [
  { value: '12px', label: '12px' },
  { value: '14px', label: '14px' },
  { value: '16px', label: '16px' },
  { value: '18px', label: '18px' },
  { value: '24px', label: '24px' },
] as const

const COLOR_PRESETS = ['#3d3530', '#d4711a', '#0f766e', '#a21caf', '#2563eb', '#dc2626', '#111827', '#6b7280']

const SUPPORTED_FORMATS = [
  'header',
  'bold',
  'italic',
  'underline',
  'strike',
  'color',
  'font',
  'size',
  'align',
  'blockquote',
  'list',
  'link',
  'image',
  'uploadedVideo',
] as const

const BRUSH_FORMAT_KEYS = ['bold', 'italic', 'underline', 'strike', 'color', 'font', 'size', 'align', 'header'] as const
const INLINE_PREFERENCE_KEYS = ['font', 'size', 'color'] as const
type InlinePreferenceKey = (typeof INLINE_PREFERENCE_KEYS)[number]

const DEFAULT_TEXT_COLOR = '#3d3530'

declare global {
  var __blogRichEditorRegistered: boolean | undefined
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

if (!globalThis.__blogRichEditorRegistered) {
  const FontClass = Quill.import('attributors/class/font') as any
  const SizeStyle = Quill.import('attributors/style/size') as any
  const AlignClass = Quill.import('attributors/class/align') as any
  const BlockEmbed = Quill.import('blots/block/embed') as any

  FontClass.whitelist = ['serif', 'sans', 'song', 'hei', 'mono']
  SizeStyle.whitelist = ['12px', '14px', '16px', '18px', '24px']
  AlignClass.whitelist = ['center', 'right', 'justify']
  Quill.register(FontClass, true)
  Quill.register(SizeStyle, true)
  Quill.register(AlignClass, true)

  class UploadedVideoBlot extends BlockEmbed {
    static blotName = 'uploadedVideo'
    static className = 'ql-uploaded-video'
    static tagName = 'div'

    static create(value: string) {
      const node = super.create() as HTMLElement
      node.setAttribute('contenteditable', 'false')

      const video = document.createElement('video')
      video.setAttribute('controls', 'controls')
      video.setAttribute('playsinline', 'true')
      video.setAttribute('preload', 'metadata')
      video.src = value

      node.appendChild(video)
      return node
    }

    static value(node: HTMLElement) {
      return node.querySelector('video')?.getAttribute('src') || ''
    }

    html() {
      const src = UploadedVideoBlot.value(this.domNode as HTMLElement)
      if (!src) return ''
      return `<div class="ql-uploaded-video"><video controls playsinline preload="metadata" src="${escapeHtml(src)}"></video></div>`
    }
  }

  Quill.register(UploadedVideoBlot, true)
  globalThis.__blogRichEditorRegistered = true
}

function ToolbarButton({ label, title, active = false, onClick, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={event => event.preventDefault()}
      onClick={onClick}
      className={`inline-flex h-9 min-w-9 items-center justify-center rounded-xl border px-2.5 text-sm transition-colors ${
        active
          ? 'border-[#d4711a] bg-[#fdf6ee] text-[#d4711a]'
          : 'border-[#e4dacb] bg-white text-[#5a4f42] hover:border-[#d4711a] hover:text-[#d4711a]'
      }`}
      aria-label={label}
    >
      {children}
    </button>
  )
}

function IconUndo() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
      <path d="M7 6 4 9l3 3" />
      <path d="M5 9h6a5 5 0 1 1 0 10h-1" />
    </svg>
  )
}

function IconRedo() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
      <path d="m13 6 3 3-3 3" />
      <path d="M15 9H9a5 5 0 1 0 0 10h1" />
    </svg>
  )
}

function IconFormatBrush() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current stroke-[1.7]">
      <path d="M6 4h8v4H6z" />
      <path d="M8 8v3" />
      <path d="M7 15c0-1.657 1.343-3 3-3h.5v1.5A2.5 2.5 0 0 1 8 16H7Z" />
    </svg>
  )
}

function IconAutoFormat() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current stroke-[1.7]">
      <path d="M4 6h12" />
      <path d="M4 10h8" />
      <path d="M4 14h12" />
      <path d="m13 3 3 3-3 3" />
    </svg>
  )
}

function IconColor({ color }: { color: string }) {
  return (
    <span className="relative inline-flex h-4 w-4 items-end justify-center font-semibold leading-none">
      <span className="text-[13px]">A</span>
      <span className="absolute bottom-0 left-0 h-[2px] w-full rounded-full" style={{ backgroundColor: color }} />
    </span>
  )
}

function IconMore() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 fill-current">
      <circle cx="4" cy="10" r="1.5" />
      <circle cx="10" cy="10" r="1.5" />
      <circle cx="16" cy="10" r="1.5" />
    </svg>
  )
}

function normalizeFormatValue(formats: Record<string, unknown>, key: string, fallback = '') {
  const value = formats[key]
  if (Array.isArray(value)) return fallback
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return fallback
}

function pickBrushFormats(formats: Record<string, unknown>) {
  const picked: Record<string, unknown> = {}

  BRUSH_FORMAT_KEYS.forEach(key => {
    const value = formats[key]
    if (Array.isArray(value)) return
    if (value !== undefined && value !== null && value !== false) {
      picked[key] = value
    }
  })

  return picked
}

function buildInitialHtml(value: string) {
  if (!value.trim()) return ''
  const html = isRichHtmlContent(value) ? value : legacyArticleToHtml(value)
  return sanitizeArticleHtml(html)
}

function normalizeEditorHtml(html: string) {
  const sanitized = sanitizeArticleHtml(html)
  const parser = new DOMParser()
  const doc = parser.parseFromString(sanitized, 'text/html')

  doc.body.querySelectorAll('span').forEach(node => {
    const element = node as HTMLSpanElement
    if (!element.getAttribute('class') && !element.getAttribute('style')) {
      element.replaceWith(...Array.from(element.childNodes))
    }
  })

  doc.body.querySelectorAll('p, h2, h3, blockquote, li').forEach(node => {
    const element = node as HTMLElement
    const text = (element.textContent || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
    if (!text && !element.querySelector('img, video, br')) {
      element.remove()
    }
  })

  return doc.body.innerHTML
    .replace(/(<p><br><\/p>\s*){3,}/g, '<p><br></p><p><br></p>')
    .trim()
}

export default function RichTextEditor({ value, onChange, placeholder = '写下今天的文章…' }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const quillRef = useRef<Quill | null>(null)
  const lastValueRef = useRef(value)
  const onChangeRef = useRef(onChange)
  const brushStateRef = useRef<BrushState>({ active: false, formats: null, sourceRange: null })
  const preferredInlineFormatsRef = useRef<PreferredInlineFormats>({})
  const [ready, setReady] = useState(false)
  const [formats, setFormats] = useState<Record<string, unknown>>({})
  const [showColorPanel, setShowColorPanel] = useState(false)
  const [showMorePanel, setShowMorePanel] = useState(false)
  const [uploadPanel, setUploadPanel] = useState<'image' | 'video' | null>(null)
  const [brushState, setBrushState] = useState<BrushState>({ active: false, formats: null, sourceRange: null })

  const currentFont = useMemo(() => normalizeFormatValue(formats, 'font', ''), [formats])
  const currentSize = useMemo(() => normalizeFormatValue(formats, 'size', '16px'), [formats])
  const currentColor = useMemo(() => normalizeFormatValue(formats, 'color', DEFAULT_TEXT_COLOR), [formats])

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  function rememberInlineFormat(key: InlinePreferenceKey, value: string | null) {
    if (!value) {
      delete preferredInlineFormatsRef.current[key]
      return
    }

    preferredInlineFormatsRef.current[key] = value
  }

  function clearRememberedInlineFormats() {
    preferredInlineFormatsRef.current = {}
  }

  function restoreRememberedInlineFormats(quill: Quill, range?: Range | null) {
    const targetRange = range ?? quill.getSelection()
    if (!targetRange || targetRange.length > 0) return false

    const preferredFormats = preferredInlineFormatsRef.current
    const currentFormats = quill.getFormat(targetRange)
    let applied = false

    INLINE_PREFERENCE_KEYS.forEach(key => {
      const preferredValue = preferredFormats[key]
      if (!preferredValue) return

      const currentValue = normalizeFormatValue(currentFormats, key, '')
      if (currentValue) return

      quill.format(key, preferredValue, Quill.sources.SILENT)
      applied = true
    })

    if (applied) {
      setFormats(quill.getFormat(targetRange))
    }

    return applied
  }

  useEffect(() => {
    if (!editorRef.current || quillRef.current) return

    const quill = new Quill(editorRef.current, {
      theme: 'snow',
      placeholder,
      modules: {
        toolbar: false,
        history: {
          delay: 400,
          maxStack: 200,
          userOnly: true,
        },
      },
      formats: [...SUPPORTED_FORMATS],
    })

    quillRef.current = quill
    const initialHtml = buildInitialHtml(value)
    if (initialHtml) {
      const delta = quill.clipboard.convert({ html: initialHtml })
      quill.setContents(delta, Quill.sources.SILENT)
    }

    let syncTimeout: NodeJS.Timeout | null = null
    
    const syncValue = () => {
      const semantic = quill.getSemanticHTML(0, quill.getLength())
      const normalized = normalizeEditorHtml(semantic)
      const nextValue = hasMeaningfulArticleContent(normalized) ? normalized : ''
      lastValueRef.current = nextValue
      
      // Debounce onChange to avoid excessive re-renders
      if (syncTimeout) clearTimeout(syncTimeout)
      syncTimeout = setTimeout(() => {
        onChangeRef.current(nextValue)
      }, 150)
    }

    let formatUpdateScheduled = false
    const syncFormats = (range?: Range | null) => {
      if (formatUpdateScheduled) return
      formatUpdateScheduled = true
      requestAnimationFrame(() => {
        setFormats(range ? quill.getFormat(range) : {})
        formatUpdateScheduled = false
      })
    }

    const handleTextChange = (_delta: unknown, _old: unknown, _source: EmitterSource) => {
      if (_source === Quill.sources.USER) {
        restoreRememberedInlineFormats(quill)
      }
      syncValue()
      // 文字变化时不立即更新格式，等 selection 变化时再更新
    }

    const handleSelectionChange = (range: Range | null, _oldRange: Range | null, source: EmitterSource) => {
      const restored =
        range && range.length === 0 && source === Quill.sources.USER
          ? restoreRememberedInlineFormats(quill, range)
          : false

      if (!restored) {
        syncFormats(range)
      }

      const brush = brushStateRef.current
      if (!brush.active || !brush.formats || !range || range.length <= 0 || source !== Quill.sources.USER) return

      if (brush.sourceRange && brush.sourceRange.index === range.index && brush.sourceRange.length === range.length) {
        return
      }

      quill.formatText(range.index, range.length, brush.formats, Quill.sources.USER)
      quill.setSelection(range.index, range.length, Quill.sources.SILENT)

      const nextBrushState = { active: false, formats: null, sourceRange: null }
      brushStateRef.current = nextBrushState
      setBrushState(nextBrushState)
    }

    quill.on(Quill.events.TEXT_CHANGE, handleTextChange)
    quill.on(Quill.events.SELECTION_CHANGE, handleSelectionChange)
    setReady(true)
    syncFormats()

    return () => {
      if (syncTimeout) clearTimeout(syncTimeout)
      quill.off(Quill.events.TEXT_CHANGE, handleTextChange)
      quill.off(Quill.events.SELECTION_CHANGE, handleSelectionChange)
      quillRef.current = null
    }
  }, [placeholder])

  useEffect(() => {
    const quill = quillRef.current
    if (!quill) return
    if (value === lastValueRef.current) return

    const nextHtml = buildInitialHtml(value)
    const delta = quill.clipboard.convert({ html: nextHtml || '<p><br></p>' })
    quill.setContents(delta, Quill.sources.SILENT)
    lastValueRef.current = value
    const selection = quill.getSelection()
    if (!restoreRememberedInlineFormats(quill, selection)) {
      setFormats(selection ? quill.getFormat(selection) : {})
    }
  }, [value])

  function withEditor(action: (quill: Quill) => void) {
    const quill = quillRef.current
    if (!quill) return
    action(quill)
    quill.focus()
  }

  function toggleInlineFormat(name: 'bold' | 'italic' | 'underline' | 'strike') {
    withEditor(quill => {
      const range = quill.getSelection(true)
      const active = Boolean(quill.getFormat(range || undefined)[name])
      quill.format(name, !active, Quill.sources.USER)
    })
  }

  function applyFont(nextValue: string) {
    withEditor(quill => {
      rememberInlineFormat('font', nextValue || null)
      quill.format('font', nextValue || false, Quill.sources.USER)
    })
  }

  function applySize(nextValue: string) {
    withEditor(quill => {
      rememberInlineFormat('size', nextValue)
      quill.format('size', nextValue, Quill.sources.USER)
    })
  }

  function applyColor(nextValue: string) {
    withEditor(quill => {
      rememberInlineFormat('color', nextValue)
      quill.format('color', nextValue, Quill.sources.USER)
      setShowColorPanel(false)
    })
  }

  function toggleFormatBrush() {
    const quill = quillRef.current
    if (!quill) return

    if (brushStateRef.current.active) {
      const nextBrushState = { active: false, formats: null, sourceRange: null }
      brushStateRef.current = nextBrushState
      setBrushState(nextBrushState)
      return
    }

    const range = quill.getSelection(true)
    const nextFormats = pickBrushFormats(quill.getFormat(range || undefined))
    if (Object.keys(nextFormats).length === 0) return

    const nextBrushState = {
      active: true,
      formats: nextFormats,
      sourceRange: range,
    }

    brushStateRef.current = nextBrushState
    setBrushState(nextBrushState)
  }

  function autoFormat() {
    withEditor(quill => {
      const normalized = normalizeEditorHtml(quill.getSemanticHTML(0, quill.getLength()))
      const delta = quill.clipboard.convert({ html: normalized || '<p><br></p>' })
      quill.setContents(delta, Quill.sources.USER)
      restoreRememberedInlineFormats(quill)
    })
  }

  function applyHeading(level: 2 | 3) {
    withEditor(quill => {
      const current = quill.getFormat(quill.getSelection(true) || undefined).header
      quill.format('header', current === level ? false : level, Quill.sources.USER)
      restoreRememberedInlineFormats(quill)
      setShowMorePanel(false)
    })
  }

  function toggleBlockquote() {
    withEditor(quill => {
      const active = Boolean(quill.getFormat(quill.getSelection(true) || undefined).blockquote)
      quill.format('blockquote', !active, Quill.sources.USER)
      restoreRememberedInlineFormats(quill)
      setShowMorePanel(false)
    })
  }

  function applyList(type: 'ordered' | 'bullet') {
    withEditor(quill => {
      const current = normalizeFormatValue(quill.getFormat(quill.getSelection(true) || undefined), 'list', '')
      quill.format('list', current === type ? false : type, Quill.sources.USER)
      restoreRememberedInlineFormats(quill)
      setShowMorePanel(false)
    })
  }

  function applyAlign(nextValue: '' | 'center' | 'right') {
    withEditor(quill => {
      quill.format('align', nextValue || false, Quill.sources.USER)
      restoreRememberedInlineFormats(quill)
      setShowMorePanel(false)
    })
  }

  function clearFormat() {
    withEditor(quill => {
      const range = quill.getSelection(true)
      if (!range) return
      if (range.length > 0) {
        quill.removeFormat(range.index, range.length, Quill.sources.USER)
      } else {
        quill.format('bold', false, Quill.sources.USER)
        quill.format('italic', false, Quill.sources.USER)
        quill.format('underline', false, Quill.sources.USER)
        quill.format('strike', false, Quill.sources.USER)
        quill.format('color', false, Quill.sources.USER)
        quill.format('font', false, Quill.sources.USER)
        quill.format('size', false, Quill.sources.USER)
        quill.format('align', false, Quill.sources.USER)
        quill.format('header', false, Quill.sources.USER)
        quill.format('blockquote', false, Quill.sources.USER)
        quill.format('list', false, Quill.sources.USER)
      }
      clearRememberedInlineFormats()
      setShowMorePanel(false)
    })
  }

  function insertLink() {
    const quill = quillRef.current
    if (!quill) return
    const range = quill.getSelection(true)
    if (!range || range.length <= 0) return

    const url = window.prompt('输入链接地址', 'https://')
    if (!url) return

    quill.format('link', url, Quill.sources.USER)
    quill.focus()
    setShowMorePanel(false)
  }

  function handleUploadSuccess({ url, type }: { url: string; type: 'IMAGE' | 'VIDEO' }) {
    withEditor(quill => {
      const range = quill.getSelection(true)
      const index = range ? range.index : quill.getLength()

      if (type === 'IMAGE') {
        quill.insertEmbed(index, 'image', url, Quill.sources.USER)
      } else {
        quill.insertEmbed(index, 'uploadedVideo', url, Quill.sources.USER)
      }

      quill.insertText(index + 1, '\n', Quill.sources.USER)
      quill.setSelection(index + 2, 0, Quill.sources.SILENT)
      restoreRememberedInlineFormats(quill, quill.getSelection())
      setUploadPanel(null)
      setShowMorePanel(false)
    })
  }

  return (
    <div className="space-y-3">
      <div className="rounded-[24px] border border-[#eadfce] bg-white p-4 shadow-[0_12px_30px_rgba(61,53,48,0.04)]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-[#f0ebe3] pb-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#c4b8a7]">Rich Editor</p>
            <h3 className="mt-1 text-sm font-semibold text-[#221e1a]">公众号风格富文本工具栏</h3>
          </div>
          <div className="rounded-full bg-[#faf8f5] px-3 py-1 text-[11px] text-[#8c7d68]">
            {brushState.active ? '格式刷已就绪，去选中目标文字即可套用格式' : '颜色、字号和字体会延续到新行，减少重复设置'}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={currentFont}
            onChange={event => applyFont(event.target.value)}
            className="h-9 rounded-xl border border-[#e4dacb] bg-white px-3 text-sm text-[#5a4f42] outline-none transition-colors hover:border-[#d4711a] focus:border-[#d4711a]"
          >
            {FONT_OPTIONS.map(option => (
              <option key={option.value || 'default'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={currentSize}
            onChange={event => applySize(event.target.value)}
            className="h-9 rounded-xl border border-[#e4dacb] bg-white px-3 text-sm text-[#5a4f42] outline-none transition-colors hover:border-[#d4711a] focus:border-[#d4711a]"
          >
            {SIZE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <ToolbarButton label="撤销" title="撤销" onClick={() => withEditor(quill => quill.history.undo())}>
            <IconUndo />
          </ToolbarButton>

          <ToolbarButton label="重做" title="重做" onClick={() => withEditor(quill => quill.history.redo())}>
            <IconRedo />
          </ToolbarButton>

          <ToolbarButton label="加粗" title="加粗" active={Boolean(formats.bold)} onClick={() => toggleInlineFormat('bold')}>
            <span className="text-base font-bold leading-none">B</span>
          </ToolbarButton>

          <ToolbarButton label="斜体" title="斜体" active={Boolean(formats.italic)} onClick={() => toggleInlineFormat('italic')}>
            <span className="text-base italic leading-none">I</span>
          </ToolbarButton>

          <ToolbarButton label="下划线" title="下划线" active={Boolean(formats.underline)} onClick={() => toggleInlineFormat('underline')}>
            <span className="text-base underline leading-none">U</span>
          </ToolbarButton>

          <ToolbarButton label="删除线" title="删除线" active={Boolean(formats.strike)} onClick={() => toggleInlineFormat('strike')}>
            <span className="text-base leading-none line-through">S</span>
          </ToolbarButton>

          <div className="relative">
            <ToolbarButton
              label="文字颜色"
              title="文字颜色"
              active={showColorPanel}
              onClick={() => {
                setShowColorPanel(current => !current)
                setShowMorePanel(false)
              }}
            >
              <IconColor color={currentColor || DEFAULT_TEXT_COLOR} />
            </ToolbarButton>

            {showColorPanel && (
              <div className="absolute left-0 top-11 z-20 w-56 rounded-2xl border border-[#eadfce] bg-white p-3 shadow-[0_18px_40px_rgba(34,30,26,0.12)]">
                <div className="grid grid-cols-4 gap-2">
                  {COLOR_PRESETS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onMouseDown={event => event.preventDefault()}
                      onClick={() => applyColor(color)}
                      className="h-8 rounded-lg border border-[#eadfce]"
                      style={{ backgroundColor: color }}
                      aria-label={`选择颜色 ${color}`}
                    />
                  ))}
                </div>
                <label className="mt-3 flex items-center justify-between rounded-xl bg-[#faf8f5] px-3 py-2 text-xs text-[#8c7d68]">
                  <span>自定义颜色</span>
                  <input
                    type="color"
                    value={currentColor || DEFAULT_TEXT_COLOR}
                    onChange={event => applyColor(event.target.value)}
                    className="h-6 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
                  />
                </label>
              </div>
            )}
          </div>

          <ToolbarButton
            label="格式刷"
            title={brushState.active ? '取消格式刷' : '复制当前格式并应用到下一段选中文本'}
            active={brushState.active}
            onClick={toggleFormatBrush}
          >
            <IconFormatBrush />
          </ToolbarButton>

          <ToolbarButton label="自动排版" title="清理多余格式并整理段落" onClick={autoFormat}>
            <IconAutoFormat />
          </ToolbarButton>

          <div className="relative">
            <ToolbarButton
              label="更多"
              title="更多"
              active={showMorePanel}
              onClick={() => {
                setShowMorePanel(current => !current)
                setShowColorPanel(false)
              }}
            >
              <IconMore />
            </ToolbarButton>

            {showMorePanel && (
              <div className="absolute right-0 top-11 z-20 w-56 rounded-2xl border border-[#eadfce] bg-white p-2 shadow-[0_18px_40px_rgba(34,30,26,0.12)]">
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => applyHeading(2)} className="rounded-xl bg-[#faf8f5] px-3 py-2 text-left text-sm text-[#5a4f42] hover:bg-[#fdf6ee]">标题</button>
                  <button type="button" onClick={() => applyHeading(3)} className="rounded-xl bg-[#faf8f5] px-3 py-2 text-left text-sm text-[#5a4f42] hover:bg-[#fdf6ee]">小标题</button>
                  <button type="button" onClick={toggleBlockquote} className="rounded-xl bg-[#faf8f5] px-3 py-2 text-left text-sm text-[#5a4f42] hover:bg-[#fdf6ee]">引用</button>
                  <button type="button" onClick={() => applyList('bullet')} className="rounded-xl bg-[#faf8f5] px-3 py-2 text-left text-sm text-[#5a4f42] hover:bg-[#fdf6ee]">无序列表</button>
                  <button type="button" onClick={() => applyList('ordered')} className="rounded-xl bg-[#faf8f5] px-3 py-2 text-left text-sm text-[#5a4f42] hover:bg-[#fdf6ee]">有序列表</button>
                  <button type="button" onClick={insertLink} className="rounded-xl bg-[#faf8f5] px-3 py-2 text-left text-sm text-[#5a4f42] hover:bg-[#fdf6ee]">插入链接</button>
                  <button type="button" onClick={() => applyAlign('')} className="rounded-xl bg-[#faf8f5] px-3 py-2 text-left text-sm text-[#5a4f42] hover:bg-[#fdf6ee]">左对齐</button>
                  <button type="button" onClick={() => applyAlign('center')} className="rounded-xl bg-[#faf8f5] px-3 py-2 text-left text-sm text-[#5a4f42] hover:bg-[#fdf6ee]">居中</button>
                  <button type="button" onClick={() => applyAlign('right')} className="rounded-xl bg-[#faf8f5] px-3 py-2 text-left text-sm text-[#5a4f42] hover:bg-[#fdf6ee]">右对齐</button>
                  <button type="button" onClick={clearFormat} className="rounded-xl bg-[#faf8f5] px-3 py-2 text-left text-sm text-[#5a4f42] hover:bg-[#fdf6ee]">清除格式</button>
                  <button
                    type="button"
                    onClick={() => setUploadPanel(current => current === 'image' ? null : 'image')}
                    className="rounded-xl bg-[#faf8f5] px-3 py-2 text-left text-sm text-[#5a4f42] hover:bg-[#fdf6ee]"
                  >
                    上传图片
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadPanel(current => current === 'video' ? null : 'video')}
                    className="rounded-xl bg-[#faf8f5] px-3 py-2 text-left text-sm text-[#5a4f42] hover:bg-[#fdf6ee]"
                  >
                    上传视频
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rich-editor-shell">
        {!ready && (
          <div className="rounded-[24px] border border-[#ddd5c8] bg-white px-6 py-5 text-sm text-[#a89880]">
            编辑器加载中…
          </div>
        )}
        <div ref={editorRef} className={ready ? '' : 'hidden'} />
      </div>

      {uploadPanel && (
        <div className="rounded-2xl border border-[#eadfce] bg-[#faf8f5] p-3">
          <FileUploader
            accept={uploadPanel}
            label={uploadPanel === 'image' ? '上传图片并插入到当前光标位置' : '上传视频并插入到当前光标位置'}
            onSuccess={handleUploadSuccess}
          />
          <button
            type="button"
            onMouseDown={event => event.preventDefault()}
            onClick={() => setUploadPanel(null)}
            className="mt-2 text-xs text-[#a89880] hover:text-[#5a4f42]"
          >
            取消
          </button>
        </div>
      )}
    </div>
  )
}
