'use client'

import type { ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Editor as TiptapEditor } from '@tiptap/core'
import { EditorContent, useEditor } from '@tiptap/react'
import Highlight from '@tiptap/extension-highlight'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import { Color, FontFamily, FontSize, TextStyle } from '@tiptap/extension-text-style'
import FileUploader, { type UploadLifecycleState } from './FileUploader'
import { BlockStyle, BlogAudio, BlogVideo } from './editor/extensions'
import { EDITOR_TEMPLATES, EMOJI_PRESETS } from './editor/templates'
import {
  hasMeaningfulArticleContent,
  isRichHtmlContent,
  legacyArticleToHtml,
  sanitizeArticleHtml,
} from '@/lib/article-content'
import { SHARED_FONT_OPTIONS } from '@/lib/shared-fonts'

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

type BrushPayload = {
  bold: boolean
  italic: boolean
  underline: boolean
  strike: boolean
  fontFamily?: string
  fontSize?: string
  color?: string
  highlightColor?: string
  textAlign?: string
  lineHeightBlock?: string | null
  textIndent?: string | null
  marginTop?: string | null
  marginBottom?: string | null
  blockTheme?: string | null
}

type BrushState = {
  active: boolean
  sourceKey: string | null
  payload: BrushPayload | null
}

type ToolbarSnapshot = {
  fontFamily: string
  fontSize: string
  color: string
  highlightColor: string
  lineHeightBlock: string
  marginTop: string
  marginBottom: string
  blockTheme: string
  textIndent: boolean
  textAlign: 'left' | 'center' | 'right' | 'justify'
  headingLevel: 0 | 2 | 3
  bold: boolean
  italic: boolean
  underline: boolean
  strike: boolean
  blockquote: boolean
  bulletList: boolean
  orderedList: boolean
  codeBlock: boolean
  link: boolean
}

type UploadFeedback = {
  tone: 'uploading' | 'success' | 'error'
  title: string
  detail?: string
  progress?: number | null
}

const SIZE_OPTIONS = ['14px', '16px', '18px', '20px', '24px'] as const
const LINE_HEIGHT_OPTIONS = ['1.6', '1.8', '2', '2.2'] as const
const SPACING_OPTIONS = ['0px', '12px', '20px', '24px', '32px', '40px'] as const
const TEXT_COLORS = ['#3d3530', '#d4711a', '#2563eb', '#0f766e', '#9333ea', '#dc2626', '#111827', '#6b7280']
const HIGHLIGHT_COLORS = ['#fff4cc', '#ffe0b2', '#d9f99d', '#bfdbfe', '#f5d0fe', '#fecaca']
const DEFAULT_TEXT_COLOR = '#3d3530'
const DEFAULT_LINE_HEIGHT = '1.8'
const DEFAULT_MARGIN_TOP = '0px'
const DEFAULT_MARGIN_BOTTOM = '24px'
const DEFAULT_PLACEHOLDER = '写下今天的文章…'
const INDENT_VALUE = '2em'
const BLOCK_NODE_NAMES = ['paragraph', 'heading', 'blockquote'] as const
const BLOCK_THEME_OPTIONS = [
  { value: '', label: '默认正文', shortLabel: '正文', description: '回到普通正文段落。' },
  { value: 'eyebrow', label: '眉题标签', shortLabel: '眉题', description: '适合章节、小栏目、分段提示。' },
  { value: 'lead', label: '导语开场', shortLabel: '导语', description: '适合开头摘要、情绪铺垫、结论先行。' },
  { value: 'summary', label: '摘要引导块', shortLabel: '摘要', description: '适合文章开头先交代看点和阅读路径。' },
  { value: 'guide', label: '阅读引导块', shortLabel: '引导', description: '适合把本文包含哪些部分先说清楚。' },
  { value: 'caption', label: '图片说明', shortLabel: '图注', description: '适合图片后补一句轻一点的说明文字。' },
  { value: 'note', label: '重点信息卡', shortLabel: '信息卡', description: '适合重点提醒、摘要、结论。' },
  { value: 'tip', label: '方法步骤卡', shortLabel: '建议卡', description: '适合教程、经验、步骤。' },
  { value: 'warning', label: '注意事项卡', shortLabel: '提醒卡', description: '适合风险、边界、特别说明。' },
  { value: 'quote', label: '金句引用', shortLabel: '金句', description: '适合让一句话单独成立。' },
  { value: 'closing', label: '收尾留白', shortLabel: '收尾', description: '适合结尾和回应感更强的段落。' },
] as const
const QUICK_THEME_OPTIONS = BLOCK_THEME_OPTIONS.filter(option =>
  ['lead', 'summary', 'note', 'quote', 'closing', 'caption'].includes(option.value),
)
const QUICK_INSERT_TEMPLATE_IDS = ['summary', 'photo-story', 'section', 'closing', 'signature'] as const
const QUICK_INSERT_TEMPLATES = QUICK_INSERT_TEMPLATE_IDS
  .map(id => EDITOR_TEMPLATES.find(template => template.id === id))
  .filter(Boolean) as typeof EDITOR_TEMPLATES

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function normalizeFormatValue(value: unknown, fallback = '') {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return fallback
}

function getCurrentBlockInfo(editor: TiptapEditor | null) {
  if (!editor) {
    return {
      type: 'paragraph' as const,
      level: 0 as 0 | 2 | 3,
      attrs: {} as Record<string, unknown>,
    }
  }

  const { $from } = editor.state.selection

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth)
    if (BLOCK_NODE_NAMES.includes(node.type.name as (typeof BLOCK_NODE_NAMES)[number])) {
      return {
        type: node.type.name as 'paragraph' | 'heading' | 'blockquote',
        level: node.type.name === 'heading' ? ((node.attrs.level as 2 | 3 | undefined) || 0) : 0,
        attrs: node.attrs as Record<string, unknown>,
      }
    }
  }

  return {
    type: 'paragraph' as const,
    level: 0 as 0 | 2 | 3,
    attrs: {} as Record<string, unknown>,
  }
}

function buildInitialHtml(value: string) {
  if (!value.trim()) return ''

  const html = isRichHtmlContent(value) ? value : legacyArticleToHtml(value)
  const sanitized = sanitizeArticleHtml(html)
  const parser = new DOMParser()
  const doc = parser.parseFromString(sanitized, 'text/html')

  const fontMap: Record<string, string> = {
    'ql-font-serif': "'Noto Serif SC', Georgia, serif",
    'ql-font-sans': "'Noto Sans SC', system-ui, sans-serif",
    'ql-font-song': "'Songti SC', 'STSong', 'SimSun', serif",
    'ql-font-hei': "'PingFang SC', 'Microsoft YaHei', sans-serif",
    'ql-font-mono': "'JetBrains Mono', 'Fira Code', monospace",
  }

  const alignMap: Record<string, string> = {
    'ql-align-center': 'center',
    'ql-align-right': 'right',
    'ql-align-justify': 'justify',
  }

  doc.body.querySelectorAll<HTMLElement>('*').forEach(element => {
    const classNames = Array.from(element.classList)

    classNames.forEach(className => {
      if (fontMap[className] && !element.style.fontFamily) {
        element.style.fontFamily = fontMap[className]
      }

      if (alignMap[className] && !element.style.textAlign) {
        element.style.textAlign = alignMap[className]
      }
    })

    const safeClasses = classNames.filter(className => !className.startsWith('ql-'))
    if (safeClasses.length > 0) {
      element.className = safeClasses.join(' ')
    } else {
      element.removeAttribute('class')
    }
  })

  doc.body.querySelectorAll<HTMLElement>('.ql-uploaded-image').forEach(wrapper => {
    const image = wrapper.querySelector('img')
    if (!image) {
      wrapper.remove()
      return
    }

    wrapper.replaceWith(image)
  })

  doc.body.querySelectorAll<HTMLElement>('.ql-uploaded-video').forEach(wrapper => {
    const video = wrapper.querySelector('video')
    if (!video) {
      wrapper.remove()
      return
    }

    wrapper.replaceWith(video)
  })

  doc.body.querySelectorAll('img').forEach(image => {
    if (!image.getAttribute('alt')) {
      image.setAttribute('alt', '')
    }
  })

  return doc.body.innerHTML
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

  doc.body.querySelectorAll('p, h2, h3, blockquote').forEach(node => {
    const element = node as HTMLElement
    const text = (element.textContent || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
    if (!text && !element.querySelector('img, video, audio, br')) {
      element.remove()
    }
  })

  return doc.body.innerHTML
    .replace(/(<p><\/p>\s*){3,}/g, '<p></p><p></p>')
    .trim()
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
          ? 'border-[#22c55e] bg-[#effcf4] text-[#15803d]'
          : 'border-[#d8d1c5] bg-white text-[#4b5563] hover:border-[#22c55e] hover:text-[#15803d]'
      }`}
      aria-label={label}
    >
      {children}
    </button>
  )
}

function ToolbarSelect({
  value,
  onChange,
  children,
}: {
  value: string
  onChange: (nextValue: string) => void
  children: ReactNode
}) {
  return (
    <select
      value={value}
      onChange={event => onChange(event.target.value)}
      className="h-9 min-w-[132px] rounded-xl border border-[#d8d1c5] bg-white px-3 text-sm text-[#4b5563] outline-none transition-colors hover:border-[#22c55e] focus:border-[#22c55e]"
    >
      {children}
    </select>
  )
}

function syncToolbarSnapshot(editor: TiptapEditor | null): ToolbarSnapshot {
  if (!editor) {
    return {
      fontFamily: '',
      fontSize: '16px',
      color: DEFAULT_TEXT_COLOR,
      highlightColor: '',
      lineHeightBlock: DEFAULT_LINE_HEIGHT,
      marginTop: DEFAULT_MARGIN_TOP,
      marginBottom: DEFAULT_MARGIN_BOTTOM,
      blockTheme: '',
      textIndent: false,
      textAlign: 'left',
      headingLevel: 0,
      bold: false,
      italic: false,
      underline: false,
      strike: false,
      blockquote: false,
      bulletList: false,
      orderedList: false,
      codeBlock: false,
      link: false,
    }
  }

  const textStyleAttributes = editor.getAttributes('textStyle')
  const highlightAttributes = editor.getAttributes('highlight')
  const blockInfo = getCurrentBlockInfo(editor)

  return {
    fontFamily: normalizeFormatValue(textStyleAttributes.fontFamily, ''),
    fontSize: normalizeFormatValue(textStyleAttributes.fontSize, '16px'),
    color: normalizeFormatValue(textStyleAttributes.color, DEFAULT_TEXT_COLOR),
    highlightColor: normalizeFormatValue(highlightAttributes.color, ''),
    lineHeightBlock: normalizeFormatValue(blockInfo.attrs.lineHeightBlock, DEFAULT_LINE_HEIGHT),
    marginTop: normalizeFormatValue(blockInfo.attrs.marginTop, DEFAULT_MARGIN_TOP),
    marginBottom: normalizeFormatValue(blockInfo.attrs.marginBottom, DEFAULT_MARGIN_BOTTOM),
    blockTheme: normalizeFormatValue(blockInfo.attrs.blockTheme, ''),
    textIndent: normalizeFormatValue(blockInfo.attrs.textIndent, '') === INDENT_VALUE,
    textAlign: (normalizeFormatValue(blockInfo.attrs.textAlign, 'left') || 'left') as ToolbarSnapshot['textAlign'],
    headingLevel: blockInfo.type === 'heading' ? (blockInfo.level as 0 | 2 | 3) : 0,
    bold: editor.isActive('bold'),
    italic: editor.isActive('italic'),
    underline: editor.isActive('underline'),
    strike: editor.isActive('strike'),
    blockquote: editor.isActive('blockquote'),
    bulletList: editor.isActive('bulletList'),
    orderedList: editor.isActive('orderedList'),
    codeBlock: editor.isActive('codeBlock'),
    link: editor.isActive('link'),
  }
}

function getBlockLabel(snapshot: ToolbarSnapshot) {
  if (snapshot.codeBlock) return '代码块'
  if (snapshot.bulletList) return '无序列表'
  if (snapshot.orderedList) return '有序列表'
  if (snapshot.blockquote) return '引用'
  if (snapshot.headingLevel === 2) return '标题 H2'
  if (snapshot.headingLevel === 3) return '小标题 H3'
  return '正文段落'
}

function getAlignLabel(snapshot: ToolbarSnapshot) {
  if (snapshot.textAlign === 'center') return '居中'
  if (snapshot.textAlign === 'right') return '右对齐'
  if (snapshot.textAlign === 'justify') return '两端对齐'
  return '左对齐'
}

function getFontLabel(fontFamily: string) {
  return SHARED_FONT_OPTIONS.find(option => option.value === fontFamily)?.label || '默认字体'
}

function getThemeLabel(blockTheme: string) {
  return BLOCK_THEME_OPTIONS.find(option => option.value === blockTheme)?.label || '默认正文'
}

function buildBrushPayload(snapshot: ToolbarSnapshot): BrushPayload {
  return {
    bold: snapshot.bold,
    italic: snapshot.italic,
    underline: snapshot.underline,
    strike: snapshot.strike,
    fontFamily: snapshot.fontFamily || undefined,
    fontSize: snapshot.fontSize || undefined,
    color: snapshot.color && snapshot.color !== DEFAULT_TEXT_COLOR ? snapshot.color : undefined,
    highlightColor: snapshot.highlightColor || undefined,
    textAlign: snapshot.textAlign,
    lineHeightBlock: snapshot.lineHeightBlock || DEFAULT_LINE_HEIGHT,
    textIndent: snapshot.textIndent ? INDENT_VALUE : null,
    marginTop: snapshot.marginTop || DEFAULT_MARGIN_TOP,
    marginBottom: snapshot.marginBottom || DEFAULT_MARGIN_BOTTOM,
    blockTheme: snapshot.blockTheme || null,
  }
}

function applyBrush(editor: TiptapEditor, payload: BrushPayload) {
  const chain = editor.chain().focus()

  if (payload.bold) chain.setBold()
  else chain.unsetBold()

  if (payload.italic) chain.setItalic()
  else chain.unsetItalic()

  if (payload.underline) chain.setUnderline()
  else chain.unsetUnderline()

  if (payload.strike) chain.setStrike()
  else chain.unsetStrike()

  if (payload.fontFamily) chain.setFontFamily(payload.fontFamily)
  else chain.unsetFontFamily()

  if (payload.fontSize) chain.setFontSize(payload.fontSize)
  else chain.unsetFontSize()

  if (payload.color) chain.setColor(payload.color)
  else chain.unsetColor()

  if (payload.highlightColor) chain.setHighlight({ color: payload.highlightColor })
  else chain.unsetHighlight()

  chain.setTextAlign(payload.textAlign || 'left')
  chain.setBlockStyle({
    lineHeightBlock: payload.lineHeightBlock ?? DEFAULT_LINE_HEIGHT,
    marginTop: payload.marginTop ?? DEFAULT_MARGIN_TOP,
    marginBottom: payload.marginBottom ?? DEFAULT_MARGIN_BOTTOM,
    textIndent: payload.textIndent ?? null,
    blockTheme: payload.blockTheme ?? null,
  })
  chain.run()
}

function isSameToolbarSnapshot(a: ToolbarSnapshot, b: ToolbarSnapshot) {
  return (
    a.fontFamily === b.fontFamily &&
    a.fontSize === b.fontSize &&
    a.color === b.color &&
    a.highlightColor === b.highlightColor &&
    a.lineHeightBlock === b.lineHeightBlock &&
    a.marginTop === b.marginTop &&
    a.marginBottom === b.marginBottom &&
    a.blockTheme === b.blockTheme &&
    a.textIndent === b.textIndent &&
    a.textAlign === b.textAlign &&
    a.headingLevel === b.headingLevel &&
    a.bold === b.bold &&
    a.italic === b.italic &&
    a.underline === b.underline &&
    a.strike === b.strike &&
    a.blockquote === b.blockquote &&
    a.bulletList === b.bulletList &&
    a.orderedList === b.orderedList &&
    a.codeBlock === b.codeBlock &&
    a.link === b.link
  )
}

export default function RichTextEditor({ value, onChange, placeholder = DEFAULT_PLACEHOLDER }: RichTextEditorProps) {
  const initialSnapshot = syncToolbarSnapshot(null)
  const onChangeRef = useRef(onChange)
  const lastValueRef = useRef(value)
  const lastEmittedValueRef = useRef(value)
  const pendingValueRef = useRef(value)
  const emitTimeoutRef = useRef<number | null>(null)
  const uploadFeedbackTimerRef = useRef<number | null>(null)
  const snapshotRef = useRef<ToolbarSnapshot>(initialSnapshot)
  const brushStateRef = useRef<BrushState>({ active: false, sourceKey: null, payload: null })

  const [snapshot, setSnapshot] = useState<ToolbarSnapshot>(() => initialSnapshot)
  const [showColorPanel, setShowColorPanel] = useState(false)
  const [showHighlightPanel, setShowHighlightPanel] = useState(false)
  const [showEmojiPanel, setShowEmojiPanel] = useState(false)
  const [showLinkPanel, setShowLinkPanel] = useState(false)
  const [uploadPanel, setUploadPanel] = useState<'image' | 'video' | 'audio' | null>(null)
  const [linkUrl, setLinkUrl] = useState('https://')
  const [brushState, setBrushState] = useState<BrushState>({ active: false, sourceKey: null, payload: null })
  const [uploadFeedback, setUploadFeedback] = useState<UploadFeedback | null>(null)
  const [isUploadingMedia, setIsUploadingMedia] = useState(false)
  const [showAdvancedTools, setShowAdvancedTools] = useState(true)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  function updateSnapshot(nextSnapshot: ToolbarSnapshot) {
    if (isSameToolbarSnapshot(snapshotRef.current, nextSnapshot)) return

    snapshotRef.current = nextSnapshot
    setSnapshot(nextSnapshot)
  }

  function emitChange(nextValue: string) {
    if (lastEmittedValueRef.current === nextValue) return

    lastEmittedValueRef.current = nextValue
    onChangeRef.current(nextValue)
  }

  function flushPendingChange() {
    if (emitTimeoutRef.current) {
      window.clearTimeout(emitTimeoutRef.current)
      emitTimeoutRef.current = null
    }

    emitChange(pendingValueRef.current)
  }

  useEffect(() => {
    return () => {
      if (uploadFeedbackTimerRef.current) {
        window.clearTimeout(uploadFeedbackTimerRef.current)
      }
      flushPendingChange()
    }
  }, [])

  const initialContent = useMemo(() => buildInitialHtml(value) || '<p></p>', [value])

  const editor = useEditor(
    {
      immediatelyRender: false,
      shouldRerenderOnTransaction: false,
      extensions: [
        StarterKit.configure({
          heading: {
            levels: [2, 3],
          },
        }),
        Placeholder.configure({
          placeholder,
        }),
        TextStyle.configure({
          mergeNestedSpanStyles: true,
        }),
        Color,
        FontFamily,
        FontSize,
        Underline,
        Highlight.configure({
          multicolor: true,
        }),
        TextAlign.configure({
          types: ['paragraph', 'heading', 'blockquote'],
        }),
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            rel: 'noopener noreferrer',
            target: '_blank',
          },
        }),
        Image.configure({
          inline: false,
          HTMLAttributes: {
            loading: 'lazy',
          },
        }),
        BlockStyle,
        BlogAudio,
        BlogVideo,
      ],
      editorProps: {
        attributes: {
          class: 'rich-editor-prosemirror',
          spellcheck: 'true',
          autocorrect: 'on',
          autocomplete: 'on',
          autocapitalize: 'sentences',
          lang: 'zh-CN',
        },
      },
      content: initialContent,
      onCreate: ({ editor: currentEditor }) => {
        updateSnapshot(syncToolbarSnapshot(currentEditor))
      },
      onUpdate: ({ editor: currentEditor }) => {
        updateSnapshot(syncToolbarSnapshot(currentEditor))
        const normalized = normalizeEditorHtml(currentEditor.getHTML())
        const nextValue = hasMeaningfulArticleContent(normalized) ? normalized : ''
        lastValueRef.current = nextValue
        pendingValueRef.current = nextValue

        if (emitTimeoutRef.current) {
          window.clearTimeout(emitTimeoutRef.current)
        }

        emitTimeoutRef.current = window.setTimeout(() => {
          emitTimeoutRef.current = null
          emitChange(nextValue)
        }, 180)
      },
      onBlur: ({ editor: currentEditor }) => {
        updateSnapshot(syncToolbarSnapshot(currentEditor))
        flushPendingChange()
      },
      onSelectionUpdate: ({ editor: currentEditor }) => {
        updateSnapshot(syncToolbarSnapshot(currentEditor))

        const brush = brushStateRef.current
        if (!brush.active || !brush.payload) return

        const { from, to, empty } = currentEditor.state.selection
        const nextKey = `${from}:${to}`
        if (empty || nextKey === brush.sourceKey) return

        applyBrush(currentEditor, brush.payload)

        const clearedState = { active: false, sourceKey: null, payload: null }
        brushStateRef.current = clearedState
        setBrushState(clearedState)
      },
    },
    [placeholder],
  )

  useEffect(() => {
    if (!editor) return
    if (value === lastValueRef.current) return

    if (emitTimeoutRef.current) {
      window.clearTimeout(emitTimeoutRef.current)
      emitTimeoutRef.current = null
    }

    const nextHtml = buildInitialHtml(value) || '<p></p>'
    editor.commands.setContent(nextHtml, { emitUpdate: false })
    lastValueRef.current = value
    lastEmittedValueRef.current = value
    pendingValueRef.current = value
    updateSnapshot(syncToolbarSnapshot(editor))
  }, [editor, value])

  function withEditor(action: (currentEditor: TiptapEditor) => void) {
    if (!editor) return
    action(editor)
    editor.commands.focus()
  }

  function applyFontFamily(nextValue: string) {
    withEditor(currentEditor => {
      if (nextValue) {
        currentEditor.chain().focus().setFontFamily(nextValue).run()
      } else {
        currentEditor.chain().focus().unsetFontFamily().run()
      }
    })
  }

  function applyFontSize(nextValue: string) {
    withEditor(currentEditor => {
      currentEditor.chain().focus().setFontSize(nextValue).run()
    })
  }

  function applyTextColor(nextValue: string) {
    withEditor(currentEditor => {
      currentEditor.chain().focus().setColor(nextValue).run()
      setShowColorPanel(false)
    })
  }

  function applyHighlightColor(nextValue: string) {
    withEditor(currentEditor => {
      if (nextValue) {
        currentEditor.chain().focus().setHighlight({ color: nextValue }).run()
      } else {
        currentEditor.chain().focus().unsetHighlight().run()
      }
      setShowHighlightPanel(false)
    })
  }

  function applyLineHeight(nextValue: string) {
    withEditor(currentEditor => {
      currentEditor.chain().focus().setBlockStyle({ lineHeightBlock: nextValue }).run()
    })
  }

  function applySpacing(position: 'marginTop' | 'marginBottom', nextValue: string) {
    withEditor(currentEditor => {
      currentEditor.chain().focus().setBlockStyle({ [position]: nextValue }).run()
    })
  }

  function toggleFirstLineIndent() {
    withEditor(currentEditor => {
      currentEditor
        .chain()
        .focus()
        .setBlockStyle({ textIndent: snapshot.textIndent ? null : INDENT_VALUE })
        .run()
    })
  }

  function applyBlockTheme(nextValue: string) {
    withEditor(currentEditor => {
      currentEditor.chain().focus().setBlockStyle({ blockTheme: nextValue || null }).run()
    })
  }

  function toggleFormatBrush() {
    if (!editor) return

    if (brushStateRef.current.active) {
      const clearedState = { active: false, sourceKey: null, payload: null }
      brushStateRef.current = clearedState
      setBrushState(clearedState)
      return
    }

    const { from, to } = editor.state.selection
    const payload = buildBrushPayload(snapshot)

    const nextState = {
      active: true,
      sourceKey: `${from}:${to}`,
      payload,
    }

    brushStateRef.current = nextState
    setBrushState(nextState)
  }

  function clearFormat() {
    withEditor(currentEditor => {
      currentEditor
        .chain()
        .focus()
        .unsetAllMarks()
        .unsetLink()
        .unsetHighlight()
        .unsetColor()
        .unsetFontFamily()
        .unsetFontSize()
        .setTextAlign('left')
        .unsetBlockStyle(['textIndent', 'lineHeightBlock', 'marginTop', 'marginBottom', 'blockTheme'])
        .clearNodes()
        .run()
    })
  }

  function applyHeading(level: 2 | 3) {
    withEditor(currentEditor => {
      currentEditor.chain().focus().toggleHeading({ level }).run()
    })
  }

  function toggleBlockquote() {
    withEditor(currentEditor => {
      currentEditor.chain().focus().toggleBlockquote().run()
    })
  }

  function applyList(type: 'bulletList' | 'orderedList') {
    withEditor(currentEditor => {
      if (type === 'bulletList') {
        currentEditor.chain().focus().toggleBulletList().run()
      } else {
        currentEditor.chain().focus().toggleOrderedList().run()
      }
    })
  }

  function insertDivider() {
    withEditor(currentEditor => {
      currentEditor.chain().focus().setHorizontalRule().createParagraphNear().run()
    })
  }

  function toggleCodeBlock() {
    withEditor(currentEditor => {
      currentEditor.chain().focus().toggleCodeBlock().run()
    })
  }

  function applyAlign(nextValue: ToolbarSnapshot['textAlign']) {
    withEditor(currentEditor => {
      currentEditor.chain().focus().setTextAlign(nextValue).run()
    })
  }

  function openLinkPanel() {
    if (!editor) return

    const existing = normalizeFormatValue(editor.getAttributes('link').href, 'https://')
    setLinkUrl(existing || 'https://')
    setShowLinkPanel(current => !current)
    setUploadPanel(null)
    setShowColorPanel(false)
    setShowHighlightPanel(false)
    setShowEmojiPanel(false)
  }

  function applyLink() {
    if (!editor) return

    const trimmed = linkUrl.trim()

    if (!trimmed || trimmed === 'https://') {
      editor.chain().focus().unsetLink().run()
      setShowLinkPanel(false)
      return
    }

    const { empty } = editor.state.selection
    if (empty) {
      editor
        .chain()
        .focus()
        .insertContent(`<a href="${escapeHtml(trimmed)}">${escapeHtml(trimmed)}</a>`)
        .run()
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: trimmed }).run()
    }

    setShowLinkPanel(false)
  }

  function insertEmoji(emoji: string) {
    withEditor(currentEditor => {
      currentEditor.chain().focus().insertContent(emoji).run()
      setShowEmojiPanel(false)
    })
  }

  function insertTemplate(content: string) {
    withEditor(currentEditor => {
      currentEditor.chain().focus().insertContent(content).run()
    })
  }

  function updateUploadFeedback(nextFeedback: UploadFeedback | null, autoHideMs = 0) {
    if (uploadFeedbackTimerRef.current) {
      window.clearTimeout(uploadFeedbackTimerRef.current)
      uploadFeedbackTimerRef.current = null
    }

    setUploadFeedback(nextFeedback)

    if (nextFeedback && autoHideMs > 0) {
      uploadFeedbackTimerRef.current = window.setTimeout(() => {
        setUploadFeedback(current => (current === nextFeedback ? null : current))
        uploadFeedbackTimerRef.current = null
      }, autoHideMs)
    }
  }

  function handleUploadStateChange(nextState: UploadLifecycleState) {
    if (nextState.status === 'uploading') {
      setIsUploadingMedia(true)
      updateUploadFeedback({
        tone: 'uploading',
        title: nextState.fileName ? `正在上传：${nextState.fileName}` : '媒体上传中',
        detail: nextState.progress !== null ? `进度 ${nextState.progress}% · ${nextState.mode === 'direct' ? '直传存储' : '服务器处理中'}` : nextState.message,
        progress: nextState.progress,
      })
      return
    }

    setIsUploadingMedia(false)

    if (nextState.status === 'success') {
      updateUploadFeedback({
        tone: 'success',
        title: nextState.message || '媒体已上传',
        detail: nextState.fileName ? `${nextState.fileName} 已准备插入编辑器` : '可以继续为这段媒体补充说明文字了。',
      }, 2800)
      return
    }

    updateUploadFeedback({
      tone: 'error',
      title: '媒体上传失败',
      detail: nextState.message || '请稍后重试，或改用更小的文件再次上传。',
    }, 4200)
  }

  function handleUploadSuccess({ url, type }: { url: string; type: 'IMAGE' | 'VIDEO' | 'AUDIO' }) {
    withEditor(currentEditor => {
      if (type === 'IMAGE') {
        currentEditor.chain().focus().setImage({ src: url, alt: '' }).createParagraphNear().run()
      } else if (type === 'AUDIO') {
        currentEditor.chain().focus().setBlogAudio({ src: url }).run()
      } else {
        currentEditor.chain().focus().setBlogVideo({ src: url }).run()
      }

      setUploadPanel(null)
    })

    const typeLabel = type === 'VIDEO' ? '视频' : type === 'AUDIO' ? '音频' : '图片'
    updateUploadFeedback({
      tone: 'success',
      title: `${typeLabel}已插入到当前光标位置`,
      detail: '你可以继续输入说明、标题或段落文字，编辑器不会打断输入焦点。',
    }, 3000)
  }

  const activeContextChips = [
    `当前：${getBlockLabel(snapshot)}`,
    `对齐：${getAlignLabel(snapshot)}`,
    `字体：${getFontLabel(snapshot.fontFamily)}`,
    `风格：${getThemeLabel(snapshot.blockTheme)}`,
    snapshot.textIndent ? '首行缩进已开启' : '首行缩进未开启',
    brushState.active ? '格式刷待应用' : null,
  ].filter(Boolean) as string[]

  return (
    <div className="space-y-4">
      <div className="rich-editor-workspace">
        <div className="rich-editor-main">
          <div className="rich-editor-sticky-controls">
            <div className="rich-editor-functionbar">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9ca3af]">AppMsg Editor</p>
                <h3 className="mt-1 text-sm font-semibold text-[#111827]">富文本编辑器</h3>
                <p className="mt-1 text-[11px] text-[#9ca3af]">快捷键：Ctrl/Cmd + S 保存，Ctrl/Cmd + Z 撤销，Ctrl/Cmd + Shift + Z 重做</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {activeContextChips.map(chip => (
                    <span key={chip} className="rich-editor-context-chip">
                      {chip}
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#b1997f]">快速插入</span>
                  {QUICK_INSERT_TEMPLATES.map(template => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => insertTemplate(template.content)}
                      className="rounded-full border border-[#e6ddcf] bg-[#fffaf3] px-3 py-1.5 text-[11px] text-[#8c6d4d] transition hover:border-[#d4711a] hover:text-[#d4711a]"
                    >
                      {template.title}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={isUploadingMedia}
                  onClick={() => {
                    setUploadPanel(current => (current === 'image' ? null : 'image'))
                    setShowLinkPanel(false)
                  }}
                  className={`rounded-xl px-3 py-2 text-xs font-medium transition ${
                    uploadPanel === 'image'
                      ? 'bg-[#dcfce7] text-[#15803d]'
                      : 'bg-[#effcf4] text-[#15803d] hover:bg-[#dcfce7]'
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {uploadPanel === 'image' && isUploadingMedia ? '图片上传中…' : '图片'}
                </button>
                <button
                  type="button"
                  disabled={isUploadingMedia}
                  onClick={() => {
                    setUploadPanel(current => (current === 'video' ? null : 'video'))
                    setShowLinkPanel(false)
                  }}
                  className={`rounded-xl px-3 py-2 text-xs font-medium transition ${
                    uploadPanel === 'video'
                      ? 'bg-[#dbeafe] text-[#2563eb]'
                      : 'bg-[#eef6ff] text-[#2563eb] hover:bg-[#dbeafe]'
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {uploadPanel === 'video' && isUploadingMedia ? '视频上传中…' : '视频'}
                </button>
                <button
                  type="button"
                  disabled={isUploadingMedia}
                  onClick={() => {
                    setUploadPanel(current => (current === 'audio' ? null : 'audio'))
                    setShowLinkPanel(false)
                  }}
                  className={`rounded-xl px-3 py-2 text-xs font-medium transition ${
                    uploadPanel === 'audio'
                      ? 'bg-[#fef3c7] text-[#b45309]'
                      : 'bg-[#fff7ed] text-[#b45309] hover:bg-[#fef3c7]'
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {uploadPanel === 'audio' && isUploadingMedia ? '音频上传中…' : '音频'}
                </button>
                <button
                  type="button"
                  onClick={insertDivider}
                  className="rounded-xl bg-[#f9fafb] px-3 py-2 text-xs font-medium text-[#4b5563] transition hover:bg-[#f3f4f6]"
                >
                  分割线
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdvancedTools(current => !current)}
                  className={`rounded-xl px-3 py-2 text-xs font-medium transition ${
                    showAdvancedTools
                      ? 'bg-[#111827] text-white hover:bg-[#1f2937]'
                      : 'bg-[#f9fafb] text-[#4b5563] hover:bg-[#f3f4f6]'
                  }`}
                >
                  {showAdvancedTools ? '收起高级排版' : '展开高级排版'}
                </button>
              </div>
            </div>

            {(showLinkPanel || uploadPanel) && (
              <div className="rich-editor-action-panel">
                {showLinkPanel && (
                  <div className="flex flex-col gap-3 md:flex-row md:items-center">
                    <input
                      value={linkUrl}
                      onChange={event => setLinkUrl(event.target.value)}
                      className="input"
                      placeholder="https://example.com"
                    />
                    <div className="flex gap-2">
                      <button type="button" className="btn-primary" onClick={applyLink}>
                        应用链接
                      </button>
                      <button type="button" className="btn-secondary" onClick={() => setShowLinkPanel(false)}>
                        关闭
                      </button>
                    </div>
                  </div>
                )}

                {uploadPanel && (
                  <div>
                    <FileUploader
                      accept={uploadPanel}
                      label={
                        uploadPanel === 'image'
                          ? '上传图片并插入到当前光标位置'
                          : uploadPanel === 'video'
                            ? '上传视频并插入到当前光标位置'
                            : '上传音频并插入到当前光标位置'
                      }
                      onSuccess={handleUploadSuccess}
                      onUploadStateChange={handleUploadStateChange}
                    />
                    <button
                      type="button"
                      disabled={isUploadingMedia}
                      className="mt-3 text-xs text-[#6b7280] hover:text-[#111827] disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => setUploadPanel(null)}
                    >
                      取消上传
                    </button>
                  </div>
                )}
              </div>
            )}

            {uploadFeedback ? (
              <div
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  uploadFeedback.tone === 'error'
                    ? 'border-rose-200 bg-rose-50 text-rose-700'
                    : uploadFeedback.tone === 'success'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-sky-200 bg-sky-50 text-sky-700'
                }`}
              >
                <div className="font-medium">{uploadFeedback.title}</div>
                {uploadFeedback.detail ? <div className="mt-1 text-xs opacity-90">{uploadFeedback.detail}</div> : null}
              </div>
            ) : null}

            <div className="rich-editor-toolbar">
              <div className="rich-editor-toolbar-group">
                <p className="rich-editor-toolbar-label">段落与间距</p>
                <div className="flex flex-wrap items-center gap-2">
                  <ToolbarSelect value={snapshot.fontFamily} onChange={applyFontFamily}>
                    {SHARED_FONT_OPTIONS.map(option => (
                      <option key={option.label} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </ToolbarSelect>

                  <ToolbarSelect value={snapshot.fontSize} onChange={applyFontSize}>
                    {SIZE_OPTIONS.map(option => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </ToolbarSelect>

                  <ToolbarSelect value={snapshot.lineHeightBlock} onChange={applyLineHeight}>
                    {LINE_HEIGHT_OPTIONS.map(option => (
                      <option key={option} value={option}>
                        行高 {option}
                      </option>
                    ))}
                  </ToolbarSelect>

                  <ToolbarSelect value={snapshot.blockTheme} onChange={applyBlockTheme}>
                    {BLOCK_THEME_OPTIONS.map(option => (
                      <option key={option.value || 'default'} value={option.value}>
                        风格 · {option.label}
                      </option>
                    ))}
                  </ToolbarSelect>

                  <ToolbarSelect value={snapshot.marginTop} onChange={nextValue => applySpacing('marginTop', nextValue)}>
                    {SPACING_OPTIONS.map(option => (
                      <option key={option} value={option}>
                        段前 {option.replace('px', '')}
                      </option>
                    ))}
                  </ToolbarSelect>

                  <ToolbarSelect value={snapshot.marginBottom} onChange={nextValue => applySpacing('marginBottom', nextValue)}>
                    {SPACING_OPTIONS.map(option => (
                      <option key={option} value={option}>
                        段后 {option.replace('px', '')}
                      </option>
                    ))}
                  </ToolbarSelect>

                  <ToolbarButton label="首行缩进" title="首行缩进" active={snapshot.textIndent} onClick={toggleFirstLineIndent}>
                    <span className="text-[12px] font-semibold">首行</span>
                  </ToolbarButton>
                </div>
              </div>

              <div className="rich-editor-toolbar-group">
                <p className="rich-editor-toolbar-label">常用操作</p>
                <div className="flex flex-wrap items-center gap-2">
                  <ToolbarButton label="撤销" title="撤销" onClick={() => withEditor(currentEditor => currentEditor.chain().focus().undo().run())}>
                    <span className="text-base leading-none">↶</span>
                  </ToolbarButton>
                  <ToolbarButton label="重做" title="重做" onClick={() => withEditor(currentEditor => currentEditor.chain().focus().redo().run())}>
                    <span className="text-base leading-none">↷</span>
                  </ToolbarButton>
                  <ToolbarButton label="加粗" title="加粗" active={snapshot.bold} onClick={() => withEditor(currentEditor => currentEditor.chain().focus().toggleBold().run())}>
                    <span className="text-base font-bold leading-none">B</span>
                  </ToolbarButton>
                  <ToolbarButton label="斜体" title="斜体" active={snapshot.italic} onClick={() => withEditor(currentEditor => currentEditor.chain().focus().toggleItalic().run())}>
                    <span className="text-base italic leading-none">I</span>
                  </ToolbarButton>
                  <ToolbarButton label="下划线" title="下划线" active={snapshot.underline} onClick={() => withEditor(currentEditor => currentEditor.chain().focus().toggleUnderline().run())}>
                    <span className="text-base underline leading-none">U</span>
                  </ToolbarButton>
                  <ToolbarButton label="删除线" title="删除线" active={snapshot.strike} onClick={() => withEditor(currentEditor => currentEditor.chain().focus().toggleStrike().run())}>
                    <span className="text-base leading-none line-through">S</span>
                  </ToolbarButton>

                  <div className="relative">
                    <ToolbarButton
                      label="文字颜色"
                      title="文字颜色"
                      active={showColorPanel}
                      onClick={() => {
                        setShowColorPanel(current => !current)
                        setShowHighlightPanel(false)
                        setShowEmojiPanel(false)
                        setShowLinkPanel(false)
                      }}
                    >
                      <span className="relative inline-flex h-4 w-4 items-end justify-center text-[13px] font-semibold leading-none">
                        <span>A</span>
                        <span className="absolute bottom-0 left-0 h-[2px] w-full rounded-full" style={{ backgroundColor: snapshot.color || DEFAULT_TEXT_COLOR }} />
                      </span>
                    </ToolbarButton>

                    {showColorPanel && (
                      <div className="rich-editor-popover left-0 top-11 w-56">
                        <div className="grid grid-cols-4 gap-2">
                          {TEXT_COLORS.map(color => (
                            <button
                              key={color}
                              type="button"
                              onMouseDown={event => event.preventDefault()}
                              onClick={() => applyTextColor(color)}
                              className="h-8 rounded-lg border border-[#d8d1c5]"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <ToolbarButton
                      label="高亮"
                      title="高亮"
                      active={showHighlightPanel || Boolean(snapshot.highlightColor)}
                      onClick={() => {
                        setShowHighlightPanel(current => !current)
                        setShowColorPanel(false)
                        setShowEmojiPanel(false)
                        setShowLinkPanel(false)
                      }}
                    >
                      <span className="relative inline-flex h-4 w-4 items-end justify-center text-[13px] font-semibold leading-none">
                        <span>H</span>
                        <span className="absolute bottom-0 left-0 h-[6px] w-full rounded-sm opacity-80" style={{ backgroundColor: snapshot.highlightColor || '#fff4cc' }} />
                      </span>
                    </ToolbarButton>

                    {showHighlightPanel && (
                      <div className="rich-editor-popover left-0 top-11 w-56">
                        <div className="mb-2 grid grid-cols-3 gap-2">
                          {HIGHLIGHT_COLORS.map(color => (
                            <button
                              key={color}
                              type="button"
                              onMouseDown={event => event.preventDefault()}
                              onClick={() => applyHighlightColor(color)}
                              className="h-8 rounded-lg border border-[#d8d1c5]"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <button type="button" onClick={() => applyHighlightColor('')} className="text-xs text-[#6b7280] hover:text-[#111827]">
                          清除高亮
                        </button>
                      </div>
                    )}
                  </div>

                  <ToolbarButton label="链接" title="插入链接" active={snapshot.link || showLinkPanel} onClick={openLinkPanel}>
                    <span className="text-[13px] font-semibold">链</span>
                  </ToolbarButton>

                  <div className="relative">
                    <ToolbarButton
                      label="表情"
                      title="插入表情"
                      active={showEmojiPanel}
                      onClick={() => {
                        setShowEmojiPanel(current => !current)
                        setShowColorPanel(false)
                        setShowHighlightPanel(false)
                        setShowLinkPanel(false)
                      }}
                    >
                      <span className="text-base leading-none">☺</span>
                    </ToolbarButton>

                    {showEmojiPanel && (
                      <div className="rich-editor-popover right-0 top-11 w-56">
                        <div className="grid grid-cols-4 gap-2">
                          {EMOJI_PRESETS.map(emoji => (
                            <button
                              key={emoji}
                              type="button"
                              onMouseDown={event => event.preventDefault()}
                              onClick={() => insertEmoji(emoji)}
                              className="rounded-xl bg-[#f9fafb] px-2 py-2 text-lg hover:bg-[#eff6ff]"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <ToolbarButton label="清除格式" title="清除格式" onClick={clearFormat}>
                    <span className="text-[12px] font-semibold">清</span>
                  </ToolbarButton>
                </div>
              </div>

              {showAdvancedTools ? (
                <div className="rich-editor-toolbar-group">
                  <p className="rich-editor-toolbar-label">高级排版</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <ToolbarButton
                      label="格式刷"
                      title={brushState.active ? '取消格式刷' : '复制当前格式并应用到下一段选中文本'}
                      active={brushState.active}
                      onClick={toggleFormatBrush}
                    >
                      <span className="text-[13px] font-semibold">刷</span>
                    </ToolbarButton>

                    <ToolbarButton label="标题" title="标题" active={snapshot.headingLevel === 2} onClick={() => applyHeading(2)}>
                      <span className="text-[13px] font-semibold">H2</span>
                    </ToolbarButton>
                    <ToolbarButton label="小标题" title="小标题" active={snapshot.headingLevel === 3} onClick={() => applyHeading(3)}>
                      <span className="text-[13px] font-semibold">H3</span>
                    </ToolbarButton>
                    <ToolbarButton label="引用" title="引用" active={snapshot.blockquote} onClick={toggleBlockquote}>
                      <span className="text-[14px] leading-none">“”</span>
                    </ToolbarButton>
                    <ToolbarButton label="无序列表" title="无序列表" active={snapshot.bulletList} onClick={() => applyList('bulletList')}>
                      <span className="text-[13px] font-semibold">• 列</span>
                    </ToolbarButton>
                    <ToolbarButton label="有序列表" title="有序列表" active={snapshot.orderedList} onClick={() => applyList('orderedList')}>
                      <span className="text-[13px] font-semibold">1. 列</span>
                    </ToolbarButton>
                    <ToolbarButton label="代码块" title="代码块" active={snapshot.codeBlock} onClick={toggleCodeBlock}>
                      <span className="text-[13px] font-semibold">{'</>'}</span>
                    </ToolbarButton>
                    {QUICK_THEME_OPTIONS.map(option => (
                      <ToolbarButton
                        key={option.value}
                        label={option.label}
                        title={option.description}
                        active={snapshot.blockTheme === option.value}
                        onClick={() => applyBlockTheme(option.value)}
                      >
                        <span className="text-[12px] font-semibold">{option.shortLabel}</span>
                      </ToolbarButton>
                    ))}
                    <ToolbarButton label="左对齐" title="左对齐" active={snapshot.textAlign === 'left'} onClick={() => applyAlign('left')}>
                      <span className="text-[12px] font-semibold">左</span>
                    </ToolbarButton>
                    <ToolbarButton label="居中" title="居中" active={snapshot.textAlign === 'center'} onClick={() => applyAlign('center')}>
                      <span className="text-[12px] font-semibold">中</span>
                    </ToolbarButton>
                    <ToolbarButton label="右对齐" title="右对齐" active={snapshot.textAlign === 'right'} onClick={() => applyAlign('right')}>
                      <span className="text-[12px] font-semibold">右</span>
                    </ToolbarButton>
                    <ToolbarButton label="两端对齐" title="两端对齐" active={snapshot.textAlign === 'justify'} onClick={() => applyAlign('justify')}>
                      <span className="text-[12px] font-semibold">齐</span>
                    </ToolbarButton>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="rich-editor-shell">
            <div className="rich-editor-canvas">
              {editor ? (
                <EditorContent editor={editor} />
              ) : (
                <div className="rounded-[28px] border border-[#d8d1c5] bg-white px-8 py-10 text-sm text-[#9ca3af]">编辑器加载中…</div>
              )}
            </div>
            <div className="rich-editor-footer-note">
              正在使用参考 `vue-tiptap-appmsg-editor` 风格改造后的编辑器，支持公众号式段落节奏、模板插入、图片视频音频、首行缩进，以及与分享海报共用的一套字体库。
            </div>
          </div>

        </div>

        <aside className="rich-editor-sidebar-panel">
          <div className="rich-editor-sidebar-header">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9ca3af]">Templates</p>
              <h4 className="mt-1 text-sm font-semibold text-[#111827]">图文模板</h4>
            </div>
            <p className="text-xs leading-5 text-[#6b7280]">参考公众号编辑器的插入面板，先给你一组常用排版骨架。</p>
          </div>

          <div className="space-y-3">
            {EDITOR_TEMPLATES.map(template => (
              <button key={template.id} type="button" onClick={() => insertTemplate(template.content)} className="rich-editor-template-card">
                <span className="block text-sm font-semibold text-[#111827]">{template.title}</span>
                <span className="mt-1 block text-xs leading-5 text-[#6b7280]">{template.description}</span>
              </button>
            ))}
          </div>

          <div className="mt-5 border-t border-[#e5e7eb] pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9ca3af]">Styles</p>
            <h4 className="mt-1 text-sm font-semibold text-[#111827]">段落气质块</h4>
            <p className="mt-1 text-xs leading-5 text-[#6b7280]">不改正文结构，只给当前段落一个更清楚的表现方式。</p>

            <div className="mt-3 space-y-2">
              {BLOCK_THEME_OPTIONS.filter(option => option.value).map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => applyBlockTheme(option.value)}
                  className={`rich-editor-style-card ${snapshot.blockTheme === option.value ? 'rich-editor-style-card--active' : ''}`}
                >
                  <span className="block text-sm font-semibold text-[#111827]">{option.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-[#6b7280]">{option.description}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-[#f8fafc] px-4 py-3 text-xs text-[#6b7280]">
        <span>{brushState.active ? '格式刷已开启：现在去选中目标文字即可套用格式。' : '默认段后距为 24px，正文更接近公众号文章的阅读节奏。'}</span>
        <span>支持 HTML 富文本保存，旧内容会自动兼容导入。</span>
      </div>
    </div>
  )
}
