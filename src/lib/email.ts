import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

export async function sendTokenEmail({
  to,
  articleTitle,
  tokenUrl,
}: {
  to: string
  articleTitle: string
  tokenUrl: string
}) {
  await transporter.sendMail({
    from: `"${process.env.NEXT_PUBLIC_SITE_NAME}" <${process.env.EMAIL_FROM}>`,
    to,
    subject: `🔓 您已解锁文章：${articleTitle}`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; color: #3d3530;">
        <h2 style="font-size: 22px; margin-bottom: 16px;">感谢您的支持！</h2>
        <p style="line-height: 1.7; margin-bottom: 16px;">
          您已成功解锁文章 <strong>《${articleTitle}》</strong>。
          请点击下方链接查看文章，建议将链接收藏，以便下次访问。
        </p>
        <a href="${tokenUrl}" style="
          display: inline-block;
          background: #d4711a;
          color: white;
          text-decoration: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-size: 15px;
          margin-bottom: 24px;
        ">查看文章 →</a>
        <p style="font-size: 13px; color: #8c7d68; line-height: 1.6;">
          此链接为您专属，请勿分享给他人。<br />
          如有问题请回复此邮件联系博主。
        </p>
      </div>
    `,
  })
}
