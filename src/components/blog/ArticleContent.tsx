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
  paywallCopy?: {
    title: string
    description: string
    hint: string
    emailPlaceholder: string
    errorMessage: string
    submittingLabel: string
    submitLabel: string
    providerHint: string
  }
}

export default function ArticleContent({ slug, content, accessType, price, title, tokenValid, passwordHint, paywallCopy }: Props) {
  const [unlockedContent, setUnlockedContent] = useState<string | null>(null)

  if (accessType === 'PUBLIC') return <MarkdownBody content={content} />
  if (accessType === 'PAID' && tokenValid) return <MarkdownBody content={content} />
  if (accessType === 'PASSWORD') {
    if (unlockedContent) return <MarkdownBody content={unlockedContent} />
    return <div className="article-paywall"><PasswordGate slug={slug} hint={passwordHint} onUnlock={setUnlockedContent} /></div>
  }
  if (accessType === 'PAID' && paywallCopy) return <div className="article-paywall"><PayGate slug={slug} price={price!} copy={paywallCopy} /></div>
  return null
}

function MarkdownBody({ content }: { content: string }) {
  return <RichMarkdown content={content} className="article-body" />
}
