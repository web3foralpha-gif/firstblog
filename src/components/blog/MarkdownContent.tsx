import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import type { Components } from 'react-markdown'

type MarkdownContentProps = {
  content: string
  className?: string
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
        alt={alt || ''}
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
