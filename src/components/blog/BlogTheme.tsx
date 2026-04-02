import { getBlogThemeVariant } from '@/lib/services/site-service'

export default async function BlogTheme({ children }: { children: React.ReactNode }) {
  const theme = await getBlogThemeVariant()

  return (
    <div className="blog-theme" data-theme={theme}>
      {children}
    </div>
  )
}
