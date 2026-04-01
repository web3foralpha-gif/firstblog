import Link from 'next/link'
import Header from '@/components/blog/Header'
import { getSiteUrl } from '@/lib/site'
import { getPaymentUnlockInfo } from '@/lib/services/payment-service'

export const dynamic = 'force-dynamic'

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const siteUrl = getSiteUrl()
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
        <h1 className="font-serif text-2xl font-medium text-[#221e1a] mb-3">感谢你的支持！</h1>
        {tokenUrl ? (
          <>
            <p className="text-sm text-[#8c7d68] mb-2">
              文章《{articleTitle}》已为你解锁
            </p>
            <p className="text-sm text-[#8c7d68] mb-8">
              访问链接已发送到你的邮箱，请务必保存以便下次访问。
            </p>
            <Link href={tokenUrl} className="btn-primary inline-flex mb-4">
              立即阅读 →
            </Link>
            <div className="mt-6 p-4 bg-[#fdf6ee] border border-[#fae8d0] rounded-lg text-left">
              <p className="text-xs text-[#8c7d68] mb-1">你的专属访问链接（请收藏）：</p>
              <p className="text-xs text-[#d4711a] break-all font-mono">
                {siteUrl}{tokenUrl}
              </p>
            </div>
          </>
        ) : (
          <p className="text-sm text-[#8c7d68] mb-8">
            支付正在处理中，链接将很快发送到你的邮箱。
          </p>
        )}
        <div className="mt-8">
          <Link href="/" className="text-sm text-[#a89880] hover:text-[#d4711a]">← 返回首页</Link>
        </div>
      </main>
    </div>
  )
}
