import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import type { Components } from 'react-markdown'

type MarkdownContentProps = {
  content: string
  className?: string
}

function buildImageAltText(src?: string, alt?: string) {
  const cleanAlt = alt?.trim()
  if (cleanAlt) return cleanAlt

  if (src) {
    const normalized = src.split('?')[0].split('#')[0].split('/').pop()?.trim()
    const decoded = normalized ? decodeURIComponent(normalized).replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').trim() : ''
    if (decoded) return decoded
  }

  return '文章插图'
}

const components: Components = {
  a({ href, children, ...props }) {
    const isExternal = typeof href === 'string' && /^https?:\/\//.test(href)

    return (
      <a
        href={href}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noreferrer' : undefined}
        {...props}
      >
        {children}
      </a>
    )
  },
  img({ src, alt, ...props }) {
    if (!src) return null

    return (
      <img
        src={src}
        alt={buildImageAltText(src, alt)}
        loading="lazy"
        decoding="async"
        {...props}
      />
    )
  },
}

export default function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <article className={className ? `prose-blog ${className}` : 'prose-blog'}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={components}>
        {content}
      </ReactMarkdown>
    </article>
  )
}
