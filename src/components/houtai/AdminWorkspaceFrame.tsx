import type { ReactNode } from 'react'

import Link from 'next/link'

import { Card } from '@/components/houtai/ui'

type WorkspaceStat = {
  label: string
  value: string
  hint: string
}

type WorkspaceLink = {
  href: string
  label: string
}

type AdminWorkspaceFrameProps = {
  eyebrow?: string
  title: string
  subtitle: string
  description?: string
  stats?: WorkspaceStat[]
  links?: WorkspaceLink[]
  actions?: ReactNode
  children: ReactNode
}

export default function AdminWorkspaceFrame({
  eyebrow = 'Workspace',
  title,
  subtitle,
  description,
  stats = [],
  links = [],
  actions,
  children,
}: AdminWorkspaceFrameProps) {
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-slate-200 px-5 py-6 shadow-sm sm:px-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">{eyebrow}</p>
            <h1 className="mt-3 text-2xl font-semibold text-slate-900">{title}</h1>
            <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
            {description ? <p className="mt-3 text-sm leading-7 text-slate-500">{description}</p> : null}
            {links.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {links.map(link => (
                  <Link
                    key={`${link.href}-${link.label}`}
                    href={link.href}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          {actions ? <div className="flex flex-wrap gap-2 xl:justify-end">{actions}</div> : null}
        </div>

        {stats.length > 0 ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map(stat => (
              <div key={stat.label} className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{stat.label}</p>
                <p className="mt-3 text-xl font-semibold text-slate-900">{stat.value}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{stat.hint}</p>
              </div>
            ))}
          </div>
        ) : null}
      </Card>

      {children}
    </div>
  )
}
