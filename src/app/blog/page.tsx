import { permanentRedirect } from 'next/navigation'

type BlogPageProps = {
  searchParams?: Promise<{ q?: string }>
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const resolvedSearchParams = await (searchParams ?? Promise.resolve<{ q?: string }>({}))
  const searchQuery = resolvedSearchParams.q?.trim()

  if (searchQuery) {
    permanentRedirect(`/?q=${encodeURIComponent(searchQuery)}`)
  }

  permanentRedirect('/')
}
