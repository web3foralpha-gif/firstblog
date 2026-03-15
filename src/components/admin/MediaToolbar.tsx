'use client'

import { useMemo, useState } from 'react'
import FileUploader from './FileUploader'
import {
  ALIGN_OPTIONS,
  COLOR_OPTIONS,
  FONT_OPTIONS,
  SIZE_OPTIONS,
  type RichAlign,
  type RichColor,
  type RichFont,
  type RichSize,
} from '@/lib/rich-text'

type MediaToolbarProps = {
  onInsert: (text: string) => void
  onWrapSelection: (before: string, after: string, placeholder?: string) => void
  onApplyStyleBlock: (style: {
    font: RichFont
    size: RichSize
    color: RichColor
    align: RichAlign
  }) => void
}

type Action = {
  label: string
  before: string
  after: string
  placeholder?: string
}

const BLOCK_ACTIONS: Action[] = [
  { label: '大标题', before: '## ', after: '', placeholder: '请输入标题' },
  { label: '小标题', before: '### ', after: '', placeholder: '请输入小标题' },
  { label: '引用', before: '> ', after: '', placeholder: '请输入引用内容' },
  { label: '无序列表', before: '- ', after: '', placeholder: '列表内容' },
  { label: '有序列表', before: '1. ', after: '', placeholder: '列表内容' },
  { label: '分割线', before: '\n---\n', after: '', placeholder: '' },
]

const INLINE_ACTIONS: Action[] = [
  { label: '加粗', before: '**', after: '**', placeholder: '重点内容' },
  { label: '斜体', before: '*', after: '*', placeholder: '强调内容' },
  { label: '链接', before: '[', after: '](https://example.com)', placeholder: '链接文字' },
]

function ToolbarButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onMouseDown={event => event.preventDefault()}
      onClick={onClick}
      className="rounded-xl border border-[#ddd5c8] bg-white px-3 py-2 text-xs font-medium text-[#5a4f42] transition-colors hover:border-[#d4711a] hover:text-[#d4711a]"
    >
      {label}
    </button>
  )
}

export default function MediaToolbar({ onInsert, onWrapSelection, onApplyStyleBlock }: MediaToolbarProps) {
  const [panel, setPanel] = useState<'image' | 'video' | null>(null)
  const [font, setFont] = useState<RichFont>('serif')
  const [size, setSize] = useState<RichSize>('base')
  const [color, setColor] = useState<RichColor>('default')
  const [align, setAlign] = useState<RichAlign>('left')

  const currentStyleLabel = useMemo(() => {
    const fontLabel = FONT_OPTIONS.find(option => option.value === font)?.label
    const sizeLabel = SIZE_OPTIONS.find(option => option.value === size)?.label
    const colorLabel = COLOR_OPTIONS.find(option => option.value === color)?.label
    const alignLabel = ALIGN_OPTIONS.find(option => option.value === align)?.label
    return [fontLabel, sizeLabel, colorLabel, alignLabel].filter(Boolean).join(' / ')
  }, [align, color, font, size])

  function handleSuccess({ url, type }: { url: string; type: 'IMAGE' | 'VIDEO' }) {
    if (type === 'IMAGE') {
      onInsert(`\n![图片描述](${url})\n`)
    } else {
      onInsert(`\n::video ${url}\n`)
    }
    setPanel(null)
  }

  return (
    <div className="space-y-3 mb-3">
      <div className="rounded-[24px] border border-[#eadfce] bg-white p-4 shadow-[0_12px_30px_rgba(61,53,48,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f0ebe3] pb-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#c4b8a7]">Editor Toolbar</p>
            <h3 className="mt-1 text-sm font-semibold text-[#221e1a]">参考公众号后台的快捷排版工具</h3>
          </div>
          <div className="rounded-full bg-[#faf8f5] px-3 py-1 text-[11px] text-[#8c7d68]">
            先选中文本，再点功能按钮
          </div>
        </div>

        <div className="grid gap-4 pt-4 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-3">
            <div>
              <p className="mb-2 text-xs font-medium text-[#8c7d68]">常用文字</p>
              <div className="flex flex-wrap gap-2">
                {INLINE_ACTIONS.map(action => (
                  <ToolbarButton
                    key={action.label}
                    label={action.label}
                    onClick={() => onWrapSelection(action.before, action.after, action.placeholder)}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-[#8c7d68]">段落结构</p>
              <div className="flex flex-wrap gap-2">
                {BLOCK_ACTIONS.map(action => (
                  <ToolbarButton
                    key={action.label}
                    label={action.label}
                    onClick={() => onWrapSelection(action.before, action.after, action.placeholder)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#f0ebe3] bg-[#faf8f5] p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-[#8c7d68]">样式面板</p>
                <p className="mt-1 text-[11px] text-[#c4b8a7]">{currentStyleLabel}</p>
              </div>
              <button
                type="button"
                onMouseDown={event => event.preventDefault()}
                onClick={() => onApplyStyleBlock({ font, size, color, align })}
                className="rounded-xl bg-[#221e1a] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-[#3d3530]"
              >
                应用到选区
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <select value={font} onChange={e => setFont(e.target.value as RichFont)} className="rounded-xl border border-[#ddd5c8] bg-white px-3 py-2 text-xs text-[#5a4f42]">
                {FONT_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <select value={size} onChange={e => setSize(e.target.value as RichSize)} className="rounded-xl border border-[#ddd5c8] bg-white px-3 py-2 text-xs text-[#5a4f42]">
                {SIZE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <select value={color} onChange={e => setColor(e.target.value as RichColor)} className="rounded-xl border border-[#ddd5c8] bg-white px-3 py-2 text-xs text-[#5a4f42]">
                {COLOR_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <select value={align} onChange={e => setAlign(e.target.value as RichAlign)} className="rounded-xl border border-[#ddd5c8] bg-white px-3 py-2 text-xs text-[#5a4f42]">
                {ALIGN_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-4 border-t border-[#f0ebe3] pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-[#8c7d68]">媒体插入</span>
            <ToolbarButton label="上传图片" onClick={() => setPanel(panel === 'image' ? null : 'image')} />
            <ToolbarButton label="上传视频" onClick={() => setPanel(panel === 'video' ? null : 'video')} />
          </div>
        </div>
      </div>

      {panel && (
        <div className="rounded-2xl border border-[#eadfce] bg-[#faf8f5] p-3">
          <FileUploader
            accept={panel}
            label={panel === 'image' ? '上传图片并插入到当前光标位置' : '上传视频并插入到当前光标位置'}
            onSuccess={handleSuccess}
          />
          <button
            type="button"
            onMouseDown={event => event.preventDefault()}
            onClick={() => setPanel(null)}
            className="mt-2 text-xs text-[#a89880] hover:text-[#5a4f42]"
          >
            取消
          </button>
        </div>
      )}
    </div>
  )
}
