import type { ReactNode } from 'react'

import AdminWorkspaceFrame from '@/components/houtai/AdminWorkspaceFrame'

type WorkspaceStat = {
  label: string
  value: string
  hint: string
}

type WorkspaceLink = {
  href: string
  label: string
}

type AdminArticleWorkspaceFrameProps = {
  eyebrow?: string
  title: string
  subtitle: string
  description?: string
  stats?: WorkspaceStat[]
  links?: WorkspaceLink[]
  actions?: ReactNode
  children: ReactNode
}

export default function AdminArticleWorkspaceFrame({
  eyebrow = 'Writing Workspace',
  title,
  subtitle,
  description,
  stats = [],
  links = [],
  actions,
  children,
}: AdminArticleWorkspaceFrameProps) {
  return (
    <AdminWorkspaceFrame
      eyebrow={eyebrow}
      title={title}
      subtitle={subtitle}
      description={description}
      stats={stats}
      links={links}
      actions={actions}
    >
      {children}
    </AdminWorkspaceFrame>
  )
}
