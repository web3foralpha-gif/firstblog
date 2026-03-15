'use client'
import { useState } from 'react'
import PasswordGate from './PasswordGate'
import PayGate from './PayGate'
import RichMarkdown from './RichMarkdown'

type Props = {
  slug: string
  content: string
  accessType: 'PUBLIC' | 'PASSWORD' | 'PAID'
  price: number | null
  title: string
  tokenValid: boolean
  passwordHint?: string | null
}

export default function ArticleContent({ slug, content, accessType, price, title, tokenValid, passwordHint }: Props) {
  const [unlockedContent, setUnlockedContent] = useState<string | null>(null)

  if (accessType === 'PUBLIC') return <MarkdownBody content={content} />
  if (accessType === 'PAID' && tokenValid) return <MarkdownBody content={content} />
  if (accessType === 'PASSWORD') {
    if (unlockedContent) return <MarkdownBody content={unlockedContent} />
    return <PasswordGate slug={slug} hint={passwordHint} onUnlock={setUnlockedContent} />
  }
  if (accessType === 'PAID') return <PayGate slug={slug} price={price!} title={title} />
  return null
}

function MarkdownBody({ content }: { content: string }) {
  return <RichMarkdown content={content} />
}
