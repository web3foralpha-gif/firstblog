import Link from 'next/link'
import { getNotFoundPageData } from '@/lib/services/site-service'

export default async function NotFound() {
  const notFoundPageData = await getNotFoundPageData()

  return (
    <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center">
      <div className="text-center">
        <p className="text-6xl mb-4">🍃</p>
        <h1 className="font-serif text-3xl font-medium text-[#221e1a] mb-2">{notFoundPageData.title}</h1>
        <p className="text-[#8c7d68] mb-8">{notFoundPageData.description}</p>
        <Link href="/" className="btn-primary">{notFoundPageData.backHomeLabel}</Link>
      </div>
    </div>
  )
}
