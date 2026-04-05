import Link from 'next/link'

import BlogUtilityFrame from '@/components/blog/BlogUtilityFrame'
import { getNotFoundPageData } from '@/lib/services/site-service'

export default async function NotFound() {
  const notFoundPageData = await getNotFoundPageData()

  return (
    <BlogUtilityFrame
      icon="🍃"
      title={notFoundPageData.title}
      description={notFoundPageData.description}
      actions={<Link href="/" className="btn-primary">{notFoundPageData.backHomeLabel}</Link>}
      showMascot
    />
  )
}
