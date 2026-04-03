import { getBlogThemeVariant } from '@/lib/services/site-service'
import ThemeIndicator from './ThemeIndicator'

export default async function BlogTheme({ children }: { children: React.ReactNode }) {
  const theme = await getBlogThemeVariant()

  return (
    <div className="blog-theme" data-theme={theme}>
      <ThemeIndicator theme={theme} />
      {children}
    </div>
  )
}
