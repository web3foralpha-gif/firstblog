'use client'

import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'
import { isRichHtmlContent, sanitizeArticleHtml } from '@/lib/article-content'
import { parseRichStyle } from '@/lib/rich-text'

type Props = {
  content: string
}

type RichChunk =
  | { type: 'markdown'; content: string }
  | { type: 'style'; content: string; attrs: string }
  | { type: 'video'; url: string }

const RICH_BLOCK_RE = /:::style\s*([^\n]*)\n([\s\S]*?)\n:::|::video\s+([^\n]+)/g

function parseContent(content: string): RichChunk[] {
  const chunks: RichChunk[] = []
  let lastIndex = 0
  const matcher = new RegExp(RICH_BLOCK_RE)
  let match: RegExpExecArray | null

  while ((match = matcher.exec(content)) !== null) {
    const index = match.index ?? 0
    const rawBefore = content.slice(lastIndex, index)
    if (rawBefore.trim()) {
      chunks.push({ type: 'markdown', content: rawBefore })
    }

    if (match[1] !== undefined && match[2] !== undefined) {
      chunks.push({ type: 'style', attrs: match[1], content: match[2].trim() })
    } else if (match[3] !== undefined) {
      chunks.push({ type: 'video', url: match[3].trim() })
    }

    lastIndex = index + match[0].length
  }

  const rest = content.slice(lastIndex)
  if (rest.trim()) {
    chunks.push({ type: 'markdown', content: rest })
  }

  return chunks.length > 0 ? chunks : [{ type: 'markdown', content }]
}

function sanitizeUrl(url: string) {
  if (/^https?:\/\//.test(url) || url.startsWith('/')) {
    return url
  }
  return ''
}

function renderMarkdown(content: string, key: string) {
  return (
    <ReactMarkdown key={key} remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
      {content}
    </ReactMarkdown>
  )
}

export default function RichMarkdown({ content }: Props) {
  const sanitizedHtml = useMemo(() => {
    if (!isRichHtmlContent(content)) return ''
    return sanitizeArticleHtml(content)
  }, [content])

  if (sanitizedHtml) {
    return <article className="prose-blog" dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
  }

  const chunks = parseContent(content)

  return (
    <article className="prose-blog">
      {chunks.map((chunk, index) => {
        if (chunk.type === 'markdown') {
          return renderMarkdown(chunk.content, `markdown-${index}`)
        }

        if (chunk.type === 'video') {
          const safeUrl = sanitizeUrl(chunk.url)
          if (!safeUrl) return null

          return (
            <figure key={`video-${index}`} className="rich-video-block">
              <video controls playsInline preload="metadata" src={safeUrl} />
            </figure>
          )
        }

        const style = parseRichStyle(chunk.attrs)
        return (
          <section
            key={`style-${index}`}
            className={[
              'rich-style-block',
              `rich-style-block--font-${style.font}`,
              `rich-style-block--size-${style.size}`,
              `rich-style-block--color-${style.color}`,
              `rich-style-block--align-${style.align}`,
            ].join(' ')}
          >
            {renderMarkdown(chunk.content, `styled-markdown-${index}`)}
          </section>
        )
      })}
    </article>
  )
}
