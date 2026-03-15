import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { generateAccessToken } from '@/lib/utils'
import { sendTokenEmail } from '@/lib/email'
import Stripe from 'stripe'

// 必须用原始 body，不能用 JSON.parse
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    console.error('Webhook 签名验证失败:', err.message)
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    const payment = await prisma.payment.findUnique({
      where: { stripeSessionId: session.id },
      include: { article: { select: { title: true, slug: true } } },
    })

    if (!payment) {
      console.error('找不到对应的 payment 记录:', session.id)
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    const accessToken = generateAccessToken()

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'COMPLETED',
        accessToken,
        tokenExpiresAt: null, // 永久有效
      },
    })

    // 发送邮件
    const tokenUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/article/${payment.article.slug}?token=${accessToken}`
    try {
      await sendTokenEmail({
        to: payment.email,
        articleTitle: payment.article.title,
        tokenUrl,
      })
    } catch (emailErr) {
      console.error('邮件发送失败:', emailErr)
      // 邮件失败不影响支付记录
    }
  }

  if (event.type === 'checkout.session.expired') {
    const session = event.data.object as Stripe.Checkout.Session
    await prisma.payment.updateMany({
      where: { stripeSessionId: session.id, status: 'PENDING' },
      data: { status: 'FAILED' },
    })
  }

  return NextResponse.json({ received: true })
}
