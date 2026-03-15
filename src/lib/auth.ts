import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { getSetting } from './settings'

export async function getAdminEmail() {
  const configured = (await getSetting('admin.email')).trim().toLowerCase()
  return configured || (process.env.ADMIN_EMAIL || '').trim().toLowerCase()
}

export async function verifyAdminPassword(password: string) {
  const adminHash = (await getSetting('admin.passwordHash')).trim() || process.env.ADMIN_PASSWORD_HASH
  const adminPassword = process.env.ADMIN_PASSWORD

  if (adminHash) {
    return bcrypt.compare(password, adminHash)
  }

  if (!adminPassword) {
    throw new Error('服务器配置错误：管理员密码未设置')
  }

  return password === adminPassword
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: '邮箱', type: 'email' },
        password: { label: '密码', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const adminEmail = await getAdminEmail()
        if (!adminEmail) {
          throw new Error('服务器配置错误：管理员账号未设置')
        }

        if (credentials.email.trim().toLowerCase() !== adminEmail) return null

        const isValid = await verifyAdminPassword(credentials.password)
        if (!isValid) return null

        return {
          id: 'admin',
          email: adminEmail,
          name: '博主',
        }
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60,
  },
  pages: {
    signIn: '/admin/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.role = 'admin'
      return token
    },
    async session({ session, token }) {
      if (token) (session.user as typeof session.user & { role?: string }).role = token.role as string
      return session
    },
  },
}
