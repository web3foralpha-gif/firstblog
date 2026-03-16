import 'server-only'

import { stripe } from '@/lib/stripe'
import { runWithDatabase } from '@/lib/db'

export type PaymentUnlockInfo = {
  tokenUrl: string
  articleTitle: string
  articleSlug: string
} | null

export async function getPaymentUnlockInfo(sessionId: string): Promise<PaymentUnlockInfo> {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    return runWithDatabase(
      async db => {
        const payment = await db.payment.findUnique({
          where: { stripeSessionId: session.id },
          include: { article: { select: { title: true, slug: true } } },
        })

        if (!payment?.accessToken) {
          return null
        }

        return {
          tokenUrl: `/article/${payment.article.slug}?token=${payment.accessToken}`,
          articleTitle: payment.article.title,
          articleSlug: payment.article.slug,
        }
      },
      null,
      'payment_unlock_info',
    )
  } catch {
    return null
  }
}
