import type { ReactNode } from 'react'
import Link from 'next/link'

export type RankItem = {
  label: string
  value: number
  meta?: string
  href?: string
  highlighted?: boolean
}

export type TimelinePoint = {
  key: string
  label: string
  shortLabel: string
  value: number
}

export type SegmentItem = {
  label: string
  value: number
  tone: string
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('zh-CN').format(Math.round(value))
}

function formatPercent(numerator: number, denominator: number) {
  if (!denominator) return '—'
  const value = (numerator / denominator) * 100
  return `${new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits: value >= 10 ? 0 : 1,
  }).format(value)}%`
}

function formatDecimal(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—'
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(Number(value))
}

export function SectionCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[28px] border border-slate-200 bg-white shadow-sm ${className}`}>{children}</section>
}

export function MetricCard({
  label,
  value,
  note,
  toneClass = 'from-slate-900 via-slate-800 to-slate-700',
}: {
  label: string
  value: string
  note: string
  toneClass?: string
}) {
  return (
    <div className={`rounded-[24px] border border-slate-200 bg-gradient-to-br ${toneClass} p-5 text-white shadow-sm`}>
      <p className="text-xs uppercase tracking-[0.22em] text-white/60">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-white/72">{note}</p>
    </div>
  )
}

export function CompactStat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-800">{value}</p>
      {note ? <p className="mt-1 text-xs text-slate-400">{note}</p> : null}
    </div>
  )
}

export function FilterChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-600">
      <span className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  )
}

export function AnalyticsTabCard({
  label,
  description,
  value,
  href,
  active,
}: {
  label: string
  description: string
  value: string
  href: string
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={`rounded-[24px] border px-4 py-4 transition ${
        active
          ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
          : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      <p className={`text-xs uppercase tracking-[0.22em] ${active ? 'text-slate-300' : 'text-slate-400'}`}>{label}</p>
      <p className={`mt-3 text-lg font-semibold ${active ? 'text-white' : 'text-slate-900'}`}>{value}</p>
      <p className={`mt-2 text-sm leading-6 ${active ? 'text-slate-300' : 'text-slate-500'}`}>{description}</p>
    </Link>
  )
}

export function InsightCard({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">{eyebrow}</p>
      <p className="mt-3 text-base font-semibold text-slate-900">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  )
}

export function TimelineChartCard({
  title,
  description,
  points,
  toneClass,
  valueNote,
}: {
  title: string
  description: string
  points: TimelinePoint[]
  toneClass: string
  valueNote?: string
}) {
  const maxValue = Math.max(...points.map(point => point.value), 1)
  const labelStep = points.length > 18 ? 4 : points.length > 10 ? 2 : 1
  const gradientId = `chart-${title.replace(/[^a-zA-Z0-9_-]+/g, '-') || 'trend'}`
  const polyline = points
    .map((point, index) => {
      const x = points.length === 1 ? 50 : (index / Math.max(points.length - 1, 1)) * 100
      const y = 100 - (point.value / maxValue) * 100
      return `${x},${Math.max(0, Math.min(100, y))}`
    })
    .join(' ')

  return (
    <SectionCard className="overflow-hidden px-5 py-5 sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          <p className="mt-1 text-xs text-slate-400">{description}</p>
        </div>
        {valueNote ? <p className="text-xs text-slate-400">{valueNote}</p> : null}
      </div>

      {points.length === 0 ? (
        <p className="mt-6 text-sm text-slate-400">当前范围还没有趋势数据。</p>
      ) : (
        <>
          <div className="relative mt-5">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-36 rounded-[26px] bg-gradient-to-b from-slate-50 via-slate-50/70 to-transparent" />
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="pointer-events-none absolute inset-x-0 top-4 z-[1] h-28 w-full px-1"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgb(14 165 233)" />
                  <stop offset="50%" stopColor="rgb(45 212 191)" />
                  <stop offset="100%" stopColor="rgb(16 185 129)" />
                </linearGradient>
              </defs>
              <polyline
                fill="none"
                stroke={`url(#${gradientId})`}
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={polyline}
              />
            </svg>
          </div>
          <div className="mt-1 flex h-44 items-end gap-2">
            {points.map(point => {
              const heightPercent = Math.max(10, Math.round((point.value / maxValue) * 100))
              return (
                <div key={point.key} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <div className="flex h-36 w-full items-end rounded-[20px] bg-slate-100/80 px-1 pb-1">
                    <div
                      className={`w-full rounded-[16px] bg-gradient-to-t ${toneClass}`}
                      style={{ height: `${heightPercent}%` }}
                      title={`${point.label} · ${formatNumber(point.value)}`}
                    />
                  </div>
                  <div className="min-h-[28px] text-center text-[10px] leading-4 text-slate-400">
                    {points.length <= 8 || points.indexOf(point) % labelStep === 0 || point === points[points.length - 1]
                      ? point.shortLabel
                      : '·'}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
            <span>峰值 {formatNumber(maxValue)}</span>
            <span>·</span>
            <span>均值 {formatDecimal(points.reduce((sum, point) => sum + point.value, 0) / Math.max(points.length, 1))}</span>
            <span>·</span>
            <span>末段 {formatNumber(points[points.length - 1]?.value ?? 0)}</span>
          </div>
        </>
      )}
    </SectionCard>
  )
}

export function SegmentBarCard({
  title,
  description,
  segments,
}: {
  title: string
  description: string
  segments: SegmentItem[]
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0)

  return (
    <SectionCard className="px-5 py-5 sm:px-6">
      <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      <p className="mt-1 text-xs text-slate-400">{description}</p>
      <div className="mt-5 flex h-4 overflow-hidden rounded-full bg-slate-100">
        {segments.map(segment => (
          <div
            key={segment.label}
            className={segment.tone}
            style={{ width: `${total > 0 ? (segment.value / total) * 100 : 0}%` }}
            title={`${segment.label} · ${formatNumber(segment.value)}`}
          />
        ))}
      </div>
      <div className="mt-4 space-y-3">
        {segments.map(segment => (
          <div key={segment.label} className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${segment.tone}`} />
              <span className="truncate text-sm text-slate-600">{segment.label}</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-slate-800">{formatNumber(segment.value)}</p>
              <p className="text-[11px] text-slate-400">{formatPercent(segment.value, total)}</p>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

export function BarListChartCard({
  title,
  description,
  items,
  emptyText = '暂无数据',
}: {
  title: string
  description: string
  items: RankItem[]
  emptyText?: string
}) {
  const maxValue = Math.max(...items.map(item => item.value), 0)

  return (
    <SectionCard className="px-5 py-5 sm:px-6">
      <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      <p className="mt-1 text-xs text-slate-400">{description}</p>
      {items.length === 0 ? (
        <p className="mt-6 text-sm text-slate-400">{emptyText}</p>
      ) : (
        <div className="mt-5 space-y-4">
          {items.map((item, index) => (
            <div key={`${item.label}-${item.value}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-500">
                    {index + 1}
                  </span>
                  <p className="truncate text-sm text-slate-700">{item.label}</p>
                </div>
                <p className="text-sm font-medium text-slate-800">{formatNumber(item.value)}</p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400"
                  style={{ width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%` }}
                />
              </div>
              {item.meta ? <p className="mt-1 text-[11px] text-slate-400">{item.meta}</p> : null}
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}

export function RankListCard({ title, items }: { title: string; items: RankItem[] }) {
  return (
    <SectionCard>
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      </div>
      <div className="divide-y divide-slate-100">
        {items.length === 0 ? (
          <p className="px-5 py-10 text-sm text-slate-400">暂无数据</p>
        ) : (
          items.map((item, index) => {
            const content = (
              <>
                <div className="flex min-w-0 items-start gap-3">
                  <span className="inline-flex h-7 w-7 flex-none items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{item.label}</p>
                    {item.meta ? <p className="mt-1 text-xs text-slate-400">{item.meta}</p> : null}
                  </div>
                </div>
                <p className="ml-4 text-lg font-semibold text-slate-800">{formatNumber(item.value)}</p>
              </>
            )

            return item.href ? (
              <Link
                key={`${item.label}-${index}`}
                href={item.href}
                target={item.href.startsWith('/houtai') ? undefined : '_blank'}
                className={`flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-slate-50 ${
                  item.highlighted ? 'bg-amber-50/70' : ''
                }`}
              >
                {content}
              </Link>
            ) : (
              <div
                key={`${item.label}-${index}`}
                className={`flex items-center justify-between gap-4 px-5 py-4 ${item.highlighted ? 'bg-amber-50/70' : ''}`}
              >
                {content}
              </div>
            )
          })
        )}
      </div>
    </SectionCard>
  )
}
