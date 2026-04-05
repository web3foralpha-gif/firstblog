export const dynamic = 'force-dynamic'

import AdminAnalyticsPage from '@/components/houtai/AdminAnalyticsPage'

type PageProps = {
  searchParams: Promise<{ range?: string | string[]; device?: string | string[]; ip?: string | string[]; self?: string | string[]; tab?: string | string[] }>
}

export default function Page({ searchParams }: PageProps) {
  return <AdminAnalyticsPage searchParams={searchParams} />
}
