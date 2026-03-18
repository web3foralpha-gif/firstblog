import { getSetting } from '@/lib/settings'
import { normalizeBlogTheme } from '@/lib/blog-ui'

export default async function BlogTheme({ children }: { children: React.ReactNode }) {
  const theme = normalizeBlogTheme(await getSetting('blog.themeVariant'))

  return (
    <div className="blog-theme" data-theme={theme}>
      {children}
    </div>
  )
}
