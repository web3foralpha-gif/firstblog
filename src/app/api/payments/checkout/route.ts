import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  const { slug, email } = await req.json()

  if (!slug || !email) {
    return NextResponse.json({ error: '参数缺失' }, { status: 400 })
  }

  const article = await prisma.article.findUnique({
    where: { slug, published: true, accessType: 'PAID' },
  })
  if (!article || !article.price) {
    return NextResponse.json({ error: '文章不存在或不支持打赏' }, { status: 404 })
  }

  // 检查是否已有有效付款（防止重复扣费）
  const existing = await prisma.payment.findFirst({
    where: {
      articleId: article.id,
      email: email.toLowerCase(),
      status: 'COMPLETED',
    },
  })
  if (existing?.accessToken) {
    const tokenUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/article/${slug}?token=${existing.accessToken}`
    return NextResponse.json({ url: tokenUrl, alreadyPaid: true })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL

  // 创建 Stripe Checkout Session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    customer_email: email,
    line_items: [
      {
        price_data: {
          currency: 'cny',
          product_data: {
            name: `解锁文章：${article.title}`,
            description: `打赏博主，支持创作`,
          },
          unit_amount: Math.round(article.price * 100),
        },
        quantity: 1,
      },
    ],
    metadata: {
      articleId: article.id,
      articleSlug: slug,
      email,
    },
    success_url: `${siteUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/article/${slug}`,
  })

  // 预先记录 payment（pending 状态）
  await prisma.payment.create({
    data: {
      articleId: article.id,
      email: email.toLowerCase(),
      amount: article.price,
      currency: 'cny',
      stripeSessionId: session.id,
      status: 'PENDING',
    },
  })

  return NextResponse.json({ url: session.url })
}
