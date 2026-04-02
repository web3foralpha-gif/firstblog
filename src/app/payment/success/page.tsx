import Link from 'next/link'
import Header from '@/components/blog/Header'
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
    <div className="min-h-screen bg-[#faf8f5]">
      <Header />
      <main className="max-w-md mx-auto px-6 py-20 text-center">
        <div className="text-5xl mb-6">🎉</div>
        <h1 className="font-serif text-2xl font-medium text-[#221e1a] mb-3">{paymentSuccessPageData.successTitle}</h1>
        {tokenUrl ? (
          <>
            <p className="text-sm text-[#8c7d68] mb-2">
              {fillTextTemplate(paymentSuccessPageData.successUnlockedDescription, { title: articleTitle })}
            </p>
            <p className="text-sm text-[#8c7d68] mb-8">
              {paymentSuccessPageData.successEmailHint}
            </p>
            <Link href={tokenUrl} className="btn-primary inline-flex mb-4">
              {paymentSuccessPageData.successReadNowLabel}
            </Link>
            <div className="mt-6 p-4 bg-[#fdf6ee] border border-[#fae8d0] rounded-lg text-left">
              <p className="text-xs text-[#8c7d68] mb-1">{paymentSuccessPageData.successLinkNoticeLabel}</p>
              <p className="text-xs text-[#d4711a] break-all font-mono">
                {siteUrl}{tokenUrl}
              </p>
            </div>
          </>
        ) : (
          <p className="text-sm text-[#8c7d68] mb-8">
            {paymentSuccessPageData.successPendingDescription}
          </p>
        )}
        <div className="mt-8">
          <Link href="/" className="text-sm text-[#a89880] hover:text-[#d4711a]">{paymentSuccessPageData.successBackHomeLabel}</Link>
        </div>
      </main>
    </div>
  )
}
