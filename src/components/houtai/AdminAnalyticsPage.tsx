import Link from 'next/link'
import { headers } from 'next/headers'

import { formatDateTime } from '@/lib/utils'
import OwnerDeviceAllowlistButton from '@/components/houtai/OwnerDeviceAllowlistButton'
import { AnalyticsTabCard, FilterChip, SectionCard } from '@/components/houtai/admin-analytics-ui'
import { DEVICE_OPTIONS, RANGE_OPTIONS, buildAnalyticsHref } from '@/components/houtai/admin-analytics-helpers'
import { getAdminAnalyticsPageData } from '@/components/houtai/admin-analytics-data'
import { AdminAnalyticsTabSection } from '@/components/houtai/admin-analytics-sections'
import type { PageProps } from '@/components/houtai/admin-analytics-types'

export default async function AdminAnalyticsPage({ searchParams }: PageProps) {
  const requestHeaders = await headers()
  const analyticsData = await getAdminAnalyticsPageData({ searchParams, requestHeaders })
  const {
    now,
    rangeState,
    deviceState,
    selectedIp,
    selfState,
    selectedTab,
    currentVisitorIp,
    ownerTrafficRules,
    rangeText,
    selectedRangeLabel,
    selectedDeviceLabel,
    activeTabMeta,
    analyticsTabCards,
  } = analyticsData

  return (
    <div className="space-y-6">
      <SectionCard className="overflow-hidden">
        <div className="px-5 py-6 sm:px-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Analytics</p>
              <h1 className="mt-3 text-2xl font-semibold text-slate-900">互动与访问统计</h1>
              <p className="mt-2 text-sm text-slate-500">现在改成按模块切换查看，先总览，再深入到内容、访客或数字分身，会更清楚。</p>
            </div>

            <div className="flex flex-col gap-3 xl:items-end">
              <div className="flex flex-wrap gap-2">
                {RANGE_OPTIONS.map(option => {
                  const active = option.key === rangeState.key
                  const href = buildAnalyticsHref(option.key, deviceState, selectedIp, selfState, selectedTab)
                  return (
                    <Link
                      key={option.key}
                      href={href}
                      className={`rounded-full px-4 py-2 text-sm transition ${
                        active
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800'
                      }`}
                    >
                      {option.label}
                    </Link>
                  )
                })}
              </div>
              <div className="flex flex-wrap gap-2 xl:justify-end">
                {DEVICE_OPTIONS.map(option => {
                  const active = option.key === deviceState
                  const href = buildAnalyticsHref(rangeState.key, option.key, selectedIp, selfState, selectedTab)
                  return (
                    <Link
                      key={option.key}
                      href={href}
                      className={`rounded-full px-4 py-2 text-sm transition ${
                        active
                          ? 'bg-slate-100 text-slate-900 shadow-inner'
                          : 'border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800'
                      }`}
                    >
                      {option.label}
                    </Link>
                  )
                })}
              </div>
              <p className="text-xs text-slate-500">当前模块：{activeTabMeta.label} · {activeTabMeta.description}</p>
              <p className="text-xs text-slate-400">统计区间：{rangeText}</p>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 px-5 py-4 sm:px-6">
          <div className="flex flex-wrap gap-2">
            <FilterChip label="范围" value={selectedRangeLabel} />
            <FilterChip label="设备" value={selectedDeviceLabel} />
            <FilterChip label="IP" value={selectedIp ?? '全部访客'} />
            <FilterChip label="自己访问" value={selfState === 'hide' ? '已隐藏' : '已显示'} />
            <FilterChip label="白名单" value={ownerTrafficRules.ips.length || ownerTrafficRules.devices.length ? '已生效' : '未设置'} />
            <FilterChip label="截止" value={formatDateTime(now)} />
          </div>
        </div>

        <div className="border-t border-slate-100 px-5 py-5 sm:px-6">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {analyticsTabCards.map(item => (
              <AnalyticsTabCard
                key={item.key}
                label={item.label}
                description={item.description}
                value={item.value}
                href={buildAnalyticsHref(rangeState.key, deviceState, selectedIp, selfState, item.key)}
                active={selectedTab === item.key}
              />
            ))}
          </div>
        </div>
      </SectionCard>

      {currentVisitorIp ? (
        <SectionCard className="px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Self Traffic</p>
              <h2 className="mt-2 text-base font-semibold text-slate-900">
                {selfState === 'hide' ? '已自动隐藏你当前的访问' : '正在显示你当前的访问'}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                当前登录 IP：{currentVisitorIp}。这样能把你调试网站、反复刷新产生的噪音先筛掉。
              </p>
              <p className="mt-1 text-sm text-slate-500">
                设备白名单现在改成了精确签名匹配，不再按「iPhone / Chrome / macOS」这种宽泛关键词误伤真实访客。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={buildAnalyticsHref(
                  rangeState.key,
                  deviceState,
                  selectedIp,
                  selfState === 'hide' ? 'show' : 'hide',
                  selectedTab,
                )}
                className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              >
                {selfState === 'hide' ? '查看我的访问' : '隐藏我的访问'}
              </Link>
              <OwnerDeviceAllowlistButton />
              <Link
                href="/houtai/settings?section=analytics"
                className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              >
                去设置白名单
              </Link>
            </div>
          </div>
        </SectionCard>
      ) : null}

      {selectedIp ? (
        <SectionCard className="px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Trace</p>
              <h2 className="mt-2 text-base font-semibold text-slate-900">正在查看 IP 轨迹：{selectedIp}</h2>
              <p className="mt-1 text-sm text-slate-500">
                当前页面的统计、排行和最近记录都已切换到这个 IP
                {deviceState !== 'all' ? `，并限定为「${DEVICE_OPTIONS.find(option => option.key === deviceState)?.label}」设备` : ''}
                。
              </p>
            </div>
            <Link
              href={buildAnalyticsHref(rangeState.key, deviceState, null, selfState, selectedTab)}
              className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            >
              清除 IP 轨迹
            </Link>
          </div>
        </SectionCard>
      ) : null}

      <AdminAnalyticsTabSection data={analyticsData} />
    </div>
  )
}
