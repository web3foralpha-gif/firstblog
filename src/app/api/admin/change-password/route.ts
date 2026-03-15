import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { updateSettings } from '@/lib/settings'
import { verifyAdminPassword } from '@/lib/auth'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { oldPassword, newPassword } = await req.json()
  if (!oldPassword || !newPassword)
    return NextResponse.json({ error: '请填写所有字段' }, { status: 400 })
  if (newPassword.length < 8)
    return NextResponse.json({ error: '新密码至少 8 位' }, { status: 400 })

  const valid = await verifyAdminPassword(oldPassword)
  if (!valid) return NextResponse.json({ error: '旧密码不正确' }, { status: 403 })

  const newHash = await bcrypt.hash(newPassword, 12)
  await updateSettings({ 'admin.passwordHash': newHash })

  return NextResponse.json({
    ok: true,
    message: '管理员密码已更新，新密码立即生效',
  })
}
