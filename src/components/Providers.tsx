'use client'
import { SessionProvider } from 'next-auth/react'
import { AchievementToastProvider } from '@/components/blog/AchievementToast'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AchievementToastProvider>
        {children}
      </AchievementToastProvider>
    </SessionProvider>
  )
}
