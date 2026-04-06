import type { CommandProps } from '@tiptap/core'
import { Extension, Node, mergeAttributes } from '@tiptap/core'

const BLOCK_STYLE_TYPES = ['paragraph', 'heading', 'blockquote'] as const
const INDENT_VALUES = new Set(['0px', '2em'])
const LINE_HEIGHT_VALUES = new Set(['1.6', '1.8', '2', '2.2'])
const SPACING_VALUES = new Set(['0px', '12px', '20px', '24px', '32px', '40px'])
const BLOCK_THEME_VALUES = new Set(['eyebrow', 'lead', 'summary', 'guide', 'caption', 'note', 'tip', 'warning', 'quote', 'closing'])

export type BlockStyleAttributes = {
  textIndent?: string | null
  lineHeightBlock?: string | null
  marginTop?: string | null
  marginBottom?: string | null
  blockTheme?: string | null
}

type BlockStyleKey = keyof BlockStyleAttributes

type VideoOptions = {
  HTMLAttributes: Record<string, string>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    blockStyle: {
      setBlockStyle: (attributes: BlockStyleAttributes) => ReturnType
      unsetBlockStyle: (keys: BlockStyleKey[]) => ReturnType
    }
    blogVideo: {
      setBlogVideo: (attributes: { src: string }) => ReturnType
    }
    blogAudio: {
      setBlogAudio: (attributes: { src: string }) => ReturnType
    }
  }
}

function sanitizeTextIndent(value: string | null | undefined) {
  if (!value) return null
  return INDENT_VALUES.has(value) ? value : null
}

function sanitizeLineHeight(value: string | null | undefined) {
  if (!value) return null
  const normalized = value.replace(/em$/i, '').trim()
  return LINE_HEIGHT_VALUES.has(normalized) ? normalized : null
}

function sanitizeSpacing(value: string | null | undefined) {
  if (!value) return null
  const normalized = value.endsWith('px') ? value : `${value}px`
  return SPACING_VALUES.has(normalized) ? normalized : null
}

function sanitizeBlockTheme(value: string | null | undefined) {
  if (!value) return null
  const normalized = value.trim().toLowerCase().replace(/^rt-/, '')
  return BLOCK_THEME_VALUES.has(normalized) ? normalized : null
}

function parseBlockTheme(element: HTMLElement) {
  const themeClass = Array.from(element.classList).find(className => className.startsWith('rt-'))
  return sanitizeBlockTheme(themeClass)
}

function collectBlockPositions({
  doc,
  selection,
}: {
  doc: { nodesBetween: (from: number, to: number, fn: (node: { type: { name: string } }, pos: number) => boolean | void) => void }
  selection: { from: number; to: number; $from: { depth: number; node: (depth: number) => { type: { name: string } }; before: (depth: number) => number } }
}) {
  const positions = new Set<number>()

  doc.nodesBetween(selection.from, selection.to, (node, pos) => {
    if (BLOCK_STYLE_TYPES.includes(node.type.name as (typeof BLOCK_STYLE_TYPES)[number])) {
      positions.add(pos)
      return false
    }
    return undefined
  })

  if (positions.size === 0) {
    for (let depth = selection.$from.depth; depth > 0; depth -= 1) {
      const node = selection.$from.node(depth)
      if (BLOCK_STYLE_TYPES.includes(node.type.name as (typeof BLOCK_STYLE_TYPES)[number])) {
        positions.add(selection.$from.before(depth))
        break
      }
    }
  }

  return Array.from(positions)
}

export const BlockStyle = Extension.create({
  name: 'blockStyle',

  addGlobalAttributes() {
    return [
      {
        types: [...BLOCK_STYLE_TYPES],
        attributes: {
          textIndent: {
            default: '0px',
            parseHTML: (element: HTMLElement) => sanitizeTextIndent(element.style.textIndent),
            renderHTML: (attributes: BlockStyleAttributes) => {
              const textIndent = sanitizeTextIndent(attributes.textIndent)
              return textIndent ? { style: `text-indent: ${textIndent}` } : {}
            },
          },
          lineHeightBlock: {
            default: '1.8',
            parseHTML: (element: HTMLElement) => sanitizeLineHeight(element.style.lineHeight),
            renderHTML: (attributes: BlockStyleAttributes) => {
              const lineHeight = sanitizeLineHeight(attributes.lineHeightBlock)
              return lineHeight ? { style: `line-height: ${lineHeight}` } : {}
            },
          },
          marginTop: {
            default: '0px',
            parseHTML: (element: HTMLElement) => sanitizeSpacing(element.style.marginTop),
            renderHTML: (attributes: BlockStyleAttributes) => {
              const marginTop = sanitizeSpacing(attributes.marginTop)
              return marginTop ? { style: `margin-top: ${marginTop}` } : {}
            },
          },
          marginBottom: {
            default: '24px',
            parseHTML: (element: HTMLElement) => sanitizeSpacing(element.style.marginBottom),
            renderHTML: (attributes: BlockStyleAttributes) => {
              const marginBottom = sanitizeSpacing(attributes.marginBottom)
              return marginBottom ? { style: `margin-bottom: ${marginBottom}` } : {}
            },
          },
          blockTheme: {
            default: null,
            parseHTML: (element: HTMLElement) => parseBlockTheme(element),
            renderHTML: (attributes: BlockStyleAttributes) => {
              const blockTheme = sanitizeBlockTheme(attributes.blockTheme)
              return blockTheme ? { class: `rt-${blockTheme}` } : {}
            },
          },
        },
      },
    ]
  },

  addCommands() {
    const updateBlocks = (attributes: BlockStyleAttributes) => ({ state, dispatch }: CommandProps) => {
      const positions = collectBlockPositions({ doc: state.doc, selection: state.selection })
      if (positions.length === 0) return false

      let transaction = state.tr
      let changed = false

      positions.forEach(position => {
        const node = transaction.doc.nodeAt(position)
        if (!node || !BLOCK_STYLE_TYPES.includes(node.type.name as (typeof BLOCK_STYLE_TYPES)[number])) {
          return
        }

        const nextAttributes = { ...node.attrs }

        Object.entries(attributes).forEach(([key, value]) => {
          if (key === 'textIndent') {
            nextAttributes[key] = sanitizeTextIndent(value as string | null | undefined)
          }
          if (key === 'lineHeightBlock') {
            nextAttributes[key] = sanitizeLineHeight(value as string | null | undefined)
          }
          if (key === 'marginTop' || key === 'marginBottom') {
            nextAttributes[key] = sanitizeSpacing(value as string | null | undefined)
          }
          if (key === 'blockTheme') {
            nextAttributes[key] = sanitizeBlockTheme(value as string | null | undefined)
          }
        })

        transaction = transaction.setNodeMarkup(position, undefined, nextAttributes, node.marks)
        changed = true
      })

      if (changed && dispatch) {
        dispatch(transaction)
      }

      return changed
    }

    return {
      setBlockStyle:
        (attributes: BlockStyleAttributes) =>
        props =>
          updateBlocks(attributes)(props),
      unsetBlockStyle:
        (keys: BlockStyleKey[]) =>
        props =>
          updateBlocks(
            keys.reduce<BlockStyleAttributes>((accumulator, key) => {
              accumulator[key] = null
              return accumulator
            }, {}),
          )(props),
    }
  },
})

export const BlogVideo = Node.create<VideoOptions>({
  name: 'blogVideo',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('src'),
        renderHTML: (attributes: { src?: string | null }) => ({ src: attributes.src || '' }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'video[src]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'video',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        controls: 'controls',
        playsinline: 'true',
        preload: 'metadata',
      }),
    ]
  },

  addCommands() {
    return {
      setBlogVideo:
        attributes =>
        ({ commands }) =>
          commands.insertContent([
            {
              type: this.name,
              attrs: attributes,
            },
            {
              type: 'paragraph',
            },
          ]),
    }
  },
})

export const BlogAudio = Node.create<VideoOptions>({
  name: 'blogAudio',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('src'),
        renderHTML: (attributes: { src?: string | null }) => ({ src: attributes.src || '' }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'audio[src]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'audio',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        controls: 'controls',
        preload: 'metadata',
      }),
    ]
  },

  addCommands() {
    return {
      setBlogAudio:
        attributes =>
        ({ commands }) =>
          commands.insertContent([
            {
              type: this.name,
              attrs: attributes,
            },
            {
              type: 'paragraph',
            },
          ]),
    }
  },
})
