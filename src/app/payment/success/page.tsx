import Link from 'next/link'

import BlogUtilityFrame from '@/components/blog/BlogUtilityFrame'
import { getSiteUrl } from '@/lib/site'
import { fillTextTemplate } from '@/lib/text-template'
import { getPaymentUnlockInfo } from '@/lib/services/payment-service'
import { getPaymentSuccessPageData } from '@/lib/services/site-service'

export const dynamic = 'force-dynamic'

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const siteUrl = getSiteUrl()
  const paymentSuccessPageData = await getPaymentSuccessPageData()
  let tokenUrl: string | null = null
  let articleTitle = ''

  if (resolvedSearchParams.session_id) {
    const unlockInfo = await getPaymentUnlockInfo(resolvedSearchParams.session_id)
    if (unlockInfo) {
      tokenUrl = unlockInfo.tokenUrl
      articleTitle = unlockInfo.articleTitle
    }
  }

  return (
    <BlogUtilityFrame
      icon="🎉"
      title={paymentSuccessPageData.successTitle}
      description={
        tokenUrl
          ? (
            <>
              <p>{fillTextTemplate(paymentSuccessPageData.successUnlockedDescription, { title: articleTitle })}</p>
              <p className="mt-2">{paymentSuccessPageData.successEmailHint}</p>
            </>
          )
          : paymentSuccessPageData.successPendingDescription
      }
      actions={(
        <>
          {tokenUrl ? (
            <Link href={tokenUrl} className="btn-primary inline-flex">
              {paymentSuccessPageData.successReadNowLabel}
            </Link>
          ) : null}
          <Link href="/" className="rounded-full border border-[var(--border-color)] px-4 py-2 text-sm text-[var(--text-subtle)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]">
            {paymentSuccessPageData.successBackHomeLabel}
          </Link>
        </>
      )}
    >
      {tokenUrl ? (
        <div className="rounded-2xl border border-[var(--border-color)] bg-white/70 p-4 text-left">
          <p className="text-xs text-[var(--text-subtle)]">{paymentSuccessPageData.successLinkNoticeLabel}</p>
          <p className="mt-2 break-all font-mono text-xs text-[var(--accent)]">
            {siteUrl}{tokenUrl}
          </p>
        </div>
      ) : null}
    </BlogUtilityFrame>
  )
}
