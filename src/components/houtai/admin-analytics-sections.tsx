import Link from 'next/link'

import { formatDateTime } from '@/lib/utils'
import {
  BarListChartCard,
  CompactStat,
  InsightCard,
  MetricCard,
  RankListCard,
  SectionCard,
  SegmentBarCard,
  TimelineChartCard,
} from '@/components/houtai/admin-analytics-ui'
import {
  ACCESS_LABELS,
  ACCESS_STYLES,
  buildAnalyticsHref,
  formatDecimal,
  formatDuration,
  formatIpAddress,
  formatLatency,
  formatLocation,
  formatNumber,
  formatPercent,
  getInteractionLabel,
  getInteractionTone,
  getMascotErrorLabel,
  toTimestamp,
  truncateText,
} from '@/components/houtai/admin-analytics-helpers'
import type { AdminAnalyticsPageData } from '@/components/houtai/admin-analytics-data'

export function AdminAnalyticsTabSection({ data }: { data: AdminAnalyticsPageData }) {
  const {
    now,
    rangeState,
    deviceState,
    selectedIp,
    selfState,
    selectedTab,
    currentVisitorIp,
    ownerTrafficRules,
    siteMetrics,
    interactionTotals,
    mascotMetrics,
    mascotHealth,
    visitorQuality,
    selectedIpSummary,
    topPages,
    topReferrers,
    topBrowsers,
    topOperatingSystems,
    deviceBreakdown,
    mascotSuccessRate,
    mascotFallbackRate,
    mascotTopModel,
    mascotHealthStatus,
    mascotQuestions,
    mascotErrors,
    mascotRecentRows,
    trafficTrendPoints,
    engagementTrendPoints,
    trafficVisitorsTotal,
    trafficArticleViewsTotal,
    engagementQualifiedTotal,
    knownVisitorCount,
    unknownVisitorCount,
    totalVisitorBuckets,
    trafficSourceSegments,
    realIpSegments,
    topRegions,
    visitorIpLeaderboard,
    visitorLeaderboard,
    articleRows,
    recentVisits,
    recentInteractionRows,
    ipTraceRows,
    rangeText,
    selectedRangeLabel,
    selectedDeviceLabel,
    directRate,
    externalRate,
    interactionRate,
    shareRate,
    topArticle,
    activeTabMeta,
    analyticsTabCards,
    overviewInsights,
    topDeviceEntry,
    topOsEntry,
    topBrowserEntry,
  } = data

  return (
    <>
      {selectedTab === 'overview' ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="总访问" value={formatNumber(siteMetrics.pv)} note={`文章页占比 ${formatPercent(siteMetrics.articlePv, siteMetrics.pv)}`} toneClass="from-sky-700 via-sky-600 to-cyan-500" />
            <MetricCard label="独立访客" value={formatNumber(siteMetrics.uv)} note={`识别到 ${formatNumber(siteMetrics.uniqueIp)} 个访问 IP`} toneClass="from-emerald-700 via-emerald-600 to-teal-500" />
            <MetricCard label="有效阅读" value={formatNumber(interactionTotals.qualifiedRead)} note={`完成率 ${formatPercent(interactionTotals.qualifiedRead, interactionTotals.articleEnter)}`} toneClass="from-violet-700 via-fuchsia-600 to-purple-500" />
            <MetricCard label="新增互动" value={formatNumber(interactionTotals.interactions)} note={`赞 ${formatNumber(interactionTotals.likes)} · 转 ${formatNumber(interactionTotals.shares)} · 评 ${formatNumber(interactionTotals.comments)}`} toneClass="from-rose-700 via-pink-600 to-orange-500" />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {overviewInsights.map(item => (
              <InsightCard
                key={item.eyebrow}
                eyebrow={item.eyebrow}
                title={item.title}
                description={item.description}
              />
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <TimelineChartCard
              title="访问趋势"
              description="按当前时间范围自动切小时 / 天，能直接看出访问高峰是不是来自真实流量。"
              points={trafficTrendPoints}
              toneClass="from-sky-500 via-cyan-400 to-emerald-400"
              valueNote={`访客 ${formatNumber(trafficVisitorsTotal)} · 文章页 ${formatNumber(trafficArticleViewsTotal)}`}
            />
            <TimelineChartCard
              title="互动趋势"
              description="把点赞、转发、评论合并成一条趋势线，方便看内容有没有真正带动反馈。"
              points={engagementTrendPoints}
              toneClass="from-violet-500 via-fuchsia-400 to-rose-400"
              valueNote={`有效阅读 ${formatNumber(engagementQualifiedTotal)} · 互动 ${formatNumber(interactionTotals.interactions)}`}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
            <SegmentBarCard
              title="流量来源结构"
              description={`现在改成互斥口径：直接访问、站外引流、站内流转。文章页访问 ${formatPercent(siteMetrics.articlePv, siteMetrics.pv)} 作为质量补充单独看。`}
              segments={trafficSourceSegments}
            />
            <BarListChartCard
              title="地区热度"
              description="优先看真实访问集中在哪些地区，方便判断是不是某篇内容被外部扩散了。"
              items={topRegions}
              emptyText="当前范围还没有可识别的地区数据。"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <SectionCard className="px-5 py-5 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">访客质量速读</h2>
                  <p className="mt-1 text-xs text-slate-400">
                    这里优先看真实 IP、回访比例和浏览深度，不让你被自己的调试流量带偏。
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <CompactStat label="真实 IP" value={formatNumber(knownVisitorCount)} note={`占比 ${formatPercent(knownVisitorCount, totalVisitorBuckets)}`} />
                <CompactStat label="未知访客" value={formatNumber(unknownVisitorCount)} note={`占比 ${formatPercent(unknownVisitorCount, totalVisitorBuckets)}`} />
                <CompactStat label="回访访客" value={formatNumber(visitorQuality.returningIpCount)} note={`占比 ${formatPercent(visitorQuality.returningIpCount, totalVisitorBuckets)}`} />
                <CompactStat label="一次即走" value={formatNumber(visitorQuality.singleVisitIpCount)} note={`占比 ${formatPercent(visitorQuality.singleVisitIpCount, totalVisitorBuckets)}`} />
                <CompactStat label="平均会话" value={formatDecimal(visitorQuality.avgSessionsPerIp)} note="每个访客平均触发的会话数" />
                <CompactStat label="平均浏览页数" value={formatDecimal(visitorQuality.avgViewsPerIp)} note={`主力设备 ${topDeviceEntry?.[0] || '待识别'}`} />
              </div>
            </SectionCard>

            <BarListChartCard
              title="来源 Top"
              description="快速看哪些入口最稳定地把人带到站里。"
              items={topReferrers}
              emptyText="当前范围没有可识别的来源记录。"
            />
          </div>
        </>
      ) : null}

      {selectedTab === 'mascot' ? (
        <>
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <SectionCard className="px-5 py-5 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Digital Twin</p>
                  <h2 className="mt-2 text-sm font-semibold text-slate-800">数字分身运行概览</h2>
                  <p className="mt-1 text-xs text-slate-400">把会话量、成功率和模型健康状态单独看，方便判断现在是不是在稳定回应访客。</p>
                </div>
                <Link href="/houtai/settings?section=ai" className="text-xs text-slate-400 transition hover:text-slate-600">
                  去 AI 设置 →
                </Link>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <CompactStat label="会话总数" value={formatNumber(mascotMetrics.totalChats)} note={`访客 ${formatNumber(mascotMetrics.uniqueVisitors)} 人`} />
                <CompactStat label="成功率" value={mascotSuccessRate} note={`成功 ${formatNumber(mascotMetrics.successCount)} 次`} />
                <CompactStat label="降级率" value={mascotFallbackRate} note={`降级 ${formatNumber(mascotMetrics.fallbackCount)} 次`} />
                <CompactStat label="平均延迟" value={formatLatency(mascotMetrics.avgLatencyMs)} note={`提问 ${formatNumber(mascotMetrics.avgMessageChars ?? 0)} 字 / 回复 ${formatNumber(mascotMetrics.avgReplyChars ?? 0)} 字`} />
                <CompactStat label="当前模型" value={mascotTopModel} note={`模式 ${mascotRecentRows[0]?.mode === 'pet' ? '宠物' : '数字分身'}`} />
                <CompactStat
                  label="健康状态"
                  value={mascotHealthStatus}
                  note={mascotHealth.lastSuccessAt ? `最近成功 ${formatDateTime(mascotHealth.lastSuccessAt)}` : '还没有成功回复记录'}
                />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <CompactStat label="最近失败" value={mascotHealth.lastFailureAt ? formatDateTime(mascotHealth.lastFailureAt) : '—'} note="可快速判断是不是刚出过故障" />
                <CompactStat label="鉴权 / 余额" value={`${formatNumber(mascotHealth.authErrors)} / ${formatNumber(mascotHealth.balanceErrors)}`} note="API Key 或余额问题" />
                <CompactStat label="限流 / 网络" value={`${formatNumber(mascotHealth.rateLimitErrors)} / ${formatNumber(mascotHealth.networkErrors)}`} note="接口拥堵或网络波动" />
              </div>
            </SectionCard>

            <div className="grid gap-6">
              <RankListCard title="高频提问" items={mascotQuestions} />
              <RankListCard title="分身异常分布" items={mascotErrors} />
            </div>
          </div>

          <SectionCard>
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-800">最近分身对话</h2>
              <p className="mt-1 text-xs text-slate-400">这里只记录真实访客会话；站长白名单、自测流量和后台试聊都不会混进来。</p>
            </div>
            <div className="divide-y divide-slate-100">
              {mascotRecentRows.length === 0 ? (
                <p className="px-5 py-12 text-sm text-slate-400">当前范围还没有数字分身对话记录。</p>
              ) : (
                mascotRecentRows.map(item => (
                  <div key={item.id} className="flex items-start justify-between gap-4 px-5 py-4 transition hover:bg-slate-50/80">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${item.success ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                          {item.success ? '回复成功' : '降级回复'}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                          {item.mode === 'pet' ? '宠物模式' : '数字分身'}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500">
                          {item.model || '未记录模型'}
                        </span>
                        {!item.success && item.errorType ? (
                          <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">
                            {getMascotErrorLabel(item.errorType)}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-3 text-sm font-medium text-slate-800">问：{truncateText(item.message, 160)}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-500">答：{truncateText(item.reply, 220)}</p>
                      <p className="mt-2 text-xs text-slate-400">
                        {item.displayIp} · {item.displayLocation} · {item.displayPath}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">{item.deviceProfile.summary}</p>
                      {item.deviceProfile.detail ? <p className="mt-1 text-xs text-slate-400">{item.deviceProfile.detail}</p> : null}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-700">{formatLatency(item.latencyMs)}</p>
                      <p className="mt-1 text-xs text-slate-400">{formatDateTime(item.createdAt)}</p>
                      <div className="mt-2 flex flex-col items-end gap-2">
                        <Link
                          href={item.path || '/'}
                          target="_blank"
                          className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                        >
                          打开页面
                        </Link>
                        <Link
                          href={buildAnalyticsHref(rangeState.key, deviceState, item.displayIp, selfState, 'visitors')}
                          className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                        >
                          查看这条 IP
                        </Link>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </>
      ) : null}

      {selectedTab === 'content' ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="文章进入" value={formatNumber(interactionTotals.articleEnter)} note={`当前范围 ${selectedRangeLabel}`} toneClass="from-slate-800 via-slate-700 to-slate-600" />
            <MetricCard label="有效阅读" value={formatNumber(interactionTotals.qualifiedRead)} note={`完成率 ${formatPercent(interactionTotals.qualifiedRead, interactionTotals.articleEnter)}`} toneClass="from-violet-700 via-indigo-600 to-sky-500" />
            <MetricCard label="转发" value={formatNumber(interactionTotals.shares)} note={`占总互动 ${shareRate}`} toneClass="from-amber-600 via-orange-500 to-rose-500" />
            <MetricCard label="评论" value={formatNumber(interactionTotals.comments)} note={`点赞 ${formatNumber(interactionTotals.likes)} · 总互动 ${formatNumber(interactionTotals.interactions)}`} toneClass="from-emerald-700 via-teal-600 to-cyan-500" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <SectionCard>
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">文章表现</h2>
                  <p className="mt-1 text-xs text-slate-400">先看哪些内容真正被读完、被互动。</p>
                </div>
                <Link href="/houtai/articles" className="text-xs text-slate-400 transition hover:text-slate-600">
                  去文章管理 →
                </Link>
              </div>

              <div className="divide-y divide-slate-100">
                {articleRows.length === 0 ? (
                  <p className="px-5 py-12 text-sm text-slate-400">当前范围没有文章互动数据。</p>
                ) : (
                  articleRows.map(row => (
                    <div key={row.articleId} className="flex items-start justify-between gap-4 px-5 py-4 transition hover:bg-slate-50/80">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link href={`/houtai/articles/${row.articleId}/edit`} className="truncate text-sm font-medium text-slate-800 transition hover:text-slate-950">
                            {row.title}
                          </Link>
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${ACCESS_STYLES[row.accessType] ?? 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                            {ACCESS_LABELS[row.accessType] ?? row.accessType}
                          </span>
                          {!row.published ? (
                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                              草稿
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 text-xs text-slate-400">
                          有效阅读 {formatNumber(row.qualified)} · 进入 {formatNumber(row.enters)} · 完成率 {formatPercent(row.qualified, row.enters)}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          互动 {formatNumber(row.interactionCount)}（赞 {formatNumber(row.likes)} / 转 {formatNumber(row.shareCount)} / 评 {formatNumber(row.comments)}）
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-semibold text-slate-900">{formatNumber(row.interactionCount)}</p>
                        <p className="mt-1 text-xs text-slate-400">总互动</p>
                        <p className="mt-3 text-[11px] text-slate-400">{row.updatedAt ? `更新于 ${formatDateTime(row.updatedAt)}` : '暂无更新时间'}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </SectionCard>

            <div className="grid gap-6">
              <RankListCard title="高频页面" items={topPages} />
              <RankListCard title="来源 Top" items={topReferrers} />
            </div>
          </div>

          <SectionCard>
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-800">最近互动</h2>
              <p className="mt-1 text-xs text-slate-400">自动合并同文章、同类型、短时间内的重复互动。</p>
            </div>
            <div className="divide-y divide-slate-100">
              {recentInteractionRows.length === 0 ? (
                <p className="px-5 py-12 text-sm text-slate-400">当前范围还没有互动记录。</p>
              ) : (
                recentInteractionRows.map(item => (
                  <div key={item.id} className="flex items-start justify-between gap-4 px-5 py-4 transition hover:bg-slate-50/80">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${getInteractionTone(item.type)}`}>
                          {getInteractionLabel(item.type)}
                        </span>
                        <Link href={`/houtai/articles/${item.articleId}/edit`} className="truncate text-sm font-medium text-slate-800 transition hover:text-slate-950">
                          {item.article.title}
                        </Link>
                        {item.mergedCount > 1 ? (
                          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                            合并 {formatNumber(item.mergedCount)} 条
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-xs text-slate-400">
                        {item.channel ? `${item.channel} · ` : ''}
                        {formatIpAddress(item.ipAddress)} · {formatLocation(item.ipRegion, item.ipCity)}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">{item.deviceProfile.summary}</p>
                      {item.deviceProfile.detail ? <p className="mt-1 text-xs text-slate-400">{item.deviceProfile.detail}</p> : null}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">{formatDateTime(item.createdAt)}</p>
                      <Link
                        href={`/houtai/articles/${item.articleId}/edit`}
                        className="mt-2 inline-flex rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                      >
                        去编辑
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </>
      ) : null}

      {selectedTab === 'visitors' ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="独立访客" value={formatNumber(siteMetrics.uv)} note={`识别到 ${formatNumber(siteMetrics.uniqueIp)} 个访问 IP`} toneClass="from-sky-700 via-cyan-600 to-teal-500" />
            <MetricCard label="真实 IP" value={formatNumber(knownVisitorCount)} note={`未知访客 ${formatNumber(unknownVisitorCount)}`} toneClass="from-emerald-700 via-emerald-600 to-lime-500" />
            <MetricCard label="回访访客" value={formatNumber(visitorQuality.returningIpCount)} note={`一次即走 ${formatNumber(visitorQuality.singleVisitIpCount)}`} toneClass="from-violet-700 via-fuchsia-600 to-pink-500" />
            <MetricCard
              label={selectedIp ? '当前追踪' : '平均浏览深度'}
              value={selectedIp ? selectedIp : `${formatDecimal(visitorQuality.avgViewsPerIp)} 页`}
              note={
                selectedIp
                  ? selectedIpSummary
                    ? `${formatLocation(selectedIpSummary.ipRegion, selectedIpSummary.ipCity)} · ${formatNumber(selectedIpSummary.uniquePaths)} 个页面`
                    : '当前筛选下还没有这条 IP 的访问摘要'
                  : `平均 ${formatDecimal(visitorQuality.avgSessionsPerIp)} 次会话 · ${topDeviceEntry?.[0] || '设备待识别'}`
              }
              toneClass="from-slate-800 via-slate-700 to-slate-600"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
            <SegmentBarCard
              title="真实访客结构"
              description="把可识别真实 IP 和未知访客拆开看，先判断这批统计是不是足够干净。"
              segments={realIpSegments}
            />
            <SectionCard className="px-5 py-5 sm:px-6">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">{selectedIp ? '当前 IP 摘要' : '当前筛选速读'}</h2>
                <p className="mt-1 text-xs text-slate-400">
                  {selectedIp ? '锁定单个 IP 后，先看访问密度、页面数和地区，再决定要不要继续追踪轨迹。' : '这里把设备、范围和最值得继续追的信号先收拢到一块。'}
                </p>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {selectedIp ? (
                  <>
                    <CompactStat label="追踪 IP" value={selectedIp} note={selectedIpSummary ? formatLocation(selectedIpSummary.ipRegion, selectedIpSummary.ipCity) : '地区待识别'} />
                    <CompactStat label="访问次数" value={formatNumber(selectedIpSummary?.views ?? 0)} note={`会话 ${formatNumber(selectedIpSummary?.sessions ?? 0)} 次`} />
                    <CompactStat label="访问页面" value={formatNumber(selectedIpSummary?.uniquePaths ?? 0)} note={`平均停留 ${formatDuration(selectedIpSummary?.avgDuration ?? 0)}`} />
                    <CompactStat label="首次出现" value={selectedIpSummary?.firstSeen ? formatDateTime(selectedIpSummary.firstSeen) : '—'} />
                    <CompactStat label="最近出现" value={selectedIpSummary?.lastSeen ? formatDateTime(selectedIpSummary.lastSeen) : '—'} />
                    <CompactStat label="设备筛选" value={selectedDeviceLabel} note={selectedRangeLabel} />
                  </>
                ) : (
                  <>
                    <CompactStat label="设备筛选" value={selectedDeviceLabel} note="可随时切换手机 / 桌面 / 爬虫" />
                    <CompactStat label="查看范围" value={selectedRangeLabel} note={rangeText} />
                    <CompactStat label="主力浏览器" value={topBrowserEntry?.[0] || '待识别'} note={`系统 ${topOsEntry?.[0] || '待识别'}`} />
                    <CompactStat label="主力设备" value={topDeviceEntry?.[0] || '待识别'} note={`占比 ${topDeviceEntry ? formatPercent(topDeviceEntry[1], siteMetrics.pv) : '—'}`} />
                    <CompactStat label="热点地区" value={topRegions[0]?.label || '地区待识别'} note={topRegions[0]?.meta || '等更多真实访问后会更准'} />
                    <CompactStat label="建议追踪 IP" value={visitorIpLeaderboard[0]?.label || '暂无'} note={visitorIpLeaderboard[0]?.meta || '当前还没有足够密集的访问'} />
                  </>
                )}
              </div>
            </SectionCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <BarListChartCard title="设备分布" description="按设备类型汇总，快速看手机、桌面和平板谁更活跃。" items={deviceBreakdown} emptyText="当前范围没有设备类型数据。" />
            <BarListChartCard title="浏览器排行" description="看访客主要用什么浏览器进站，排查兼容问题会更直观。" items={topBrowsers} emptyText="当前范围没有浏览器数据。" />
            <BarListChartCard title="系统排行" description="系统分布能帮助你判断问题更集中在 iOS、Android 还是桌面端。" items={topOperatingSystems} emptyText="当前范围没有系统数据。" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <SectionCard>
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-sm font-semibold text-slate-800">详细访客榜</h2>
                <p className="mt-1 text-xs text-slate-400">优先展示真实 IP 的访问密度、设备和停留情况，匿名访客会在上面的结构里单独统计。</p>
              </div>
              <div className="divide-y divide-slate-100">
                {visitorLeaderboard.length === 0 ? (
                  <p className="px-5 py-12 text-sm text-slate-400">当前范围还没有可展示的访客数据。</p>
                ) : (
                  visitorLeaderboard.map(item => (
                    <div
                      key={`${item.displayIp}-${toTimestamp(item.lastSeen)}-${item.sessions}`}
                      className="flex items-start justify-between gap-4 px-5 py-4 transition hover:bg-slate-50/80"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                            {item.displayLocation}
                          </span>
                          <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 font-mono text-[11px] text-slate-500">
                            {item.displayIp}
                          </span>
                        </div>
                        <p className="mt-3 text-sm font-medium text-slate-800">{item.deviceProfile.summary}</p>
                        {item.deviceProfile.detail ? <p className="mt-1 text-xs text-slate-400">{item.deviceProfile.detail}</p> : null}
                        <p className="mt-2 text-xs text-slate-400">
                          会话 {formatNumber(item.sessions)} 次 · 页面 {formatNumber(item.uniquePaths)} 个 · 设备 {formatNumber(item.deviceCount)} 台
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          首访 {formatDateTime(item.firstSeen)} · 最近 {formatDateTime(item.lastSeen)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-semibold text-slate-900">{formatNumber(item.views)}</p>
                        <p className="mt-1 text-xs text-slate-400">总访问</p>
                        <p className="mt-3 text-xs text-slate-400">平均停留 {formatDuration(item.avgDuration)}</p>
                        <Link
                          href={item.traceHref}
                          className="mt-3 inline-flex rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                        >
                          查看轨迹
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </SectionCard>

            <div className="grid gap-6">
              <RankListCard title="高频 IP" items={visitorIpLeaderboard} />
              <BarListChartCard
                title="地区热度"
                description="按访问量汇总地区，看看真实流量主要落在哪些地方。"
                items={topRegions}
                emptyText="当前范围还没有可识别的地区数据。"
              />
            </div>
          </div>

          {selectedIp ? (
            <SectionCard>
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-sm font-semibold text-slate-800">单个 IP 访问轨迹</h2>
                <p className="mt-1 text-xs text-slate-400">按时间倒序展示这个 IP 在当前筛选条件下的访问路径和来源。</p>
              </div>
              <div className="divide-y divide-slate-100">
                {ipTraceRows.length === 0 ? (
                  <p className="px-5 py-12 text-sm text-slate-400">当前筛选条件下还没有这条 IP 的访问轨迹。</p>
                ) : (
                  ipTraceRows.map(item => (
                    <div key={item.id} className="flex items-start justify-between gap-4 px-5 py-4 transition hover:bg-slate-50/80">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-500">
                            会话 {item.sessionId.slice(-8)}
                          </span>
                          <Link href={item.path} target="_blank" className="truncate text-sm font-medium text-slate-800 transition hover:text-slate-950">
                            {item.displayPath}
                          </Link>
                        </div>
                        <p className="mt-2 text-xs text-slate-400">{item.deviceProfile.summary}</p>
                        {item.deviceProfile.detail ? <p className="mt-1 text-xs text-slate-400">{item.deviceProfile.detail}</p> : null}
                        <p className="mt-1 text-xs text-slate-400">来源 {item.displayReferrer}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-slate-700">{formatDuration(item.duration)}</p>
                        <p className="mt-1 text-xs text-slate-400">{formatDateTime(item.enteredAt)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </SectionCard>
          ) : null}

          <SectionCard>
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-800">最近访问</h2>
              <p className="mt-1 text-xs text-slate-400">自动合并同会话、同页面、短时间内的重复访问记录。</p>
            </div>
            <div className="divide-y divide-slate-100">
              {recentVisits.length === 0 ? (
                <p className="px-5 py-12 text-sm text-slate-400">当前范围还没有访问记录。</p>
              ) : (
                recentVisits.map(item => (
                  <div key={item.id} className="flex items-start justify-between gap-4 px-5 py-4 transition hover:bg-slate-50/80">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={item.path} target="_blank" className="text-sm font-medium text-slate-800 transition hover:text-slate-950">
                          {item.displayPath}
                        </Link>
                        {item.mergedCount > 1 ? (
                          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                            合并 {formatNumber(item.mergedCount)} 条
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-xs font-mono text-slate-500">{item.displayIp}</p>
                      <p className="mt-1 text-xs text-slate-400">{item.displayLocation} · {item.displayReferrer}</p>
                      <p className="mt-1 text-xs text-slate-400">{item.deviceProfile.summary}</p>
                      {item.deviceProfile.detail ? <p className="mt-1 text-xs text-slate-400">{item.deviceProfile.detail}</p> : null}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-700">{formatDuration(item.mergedDuration)}</p>
                      <p className="mt-1 text-xs text-slate-400">{formatDateTime(item.enteredAt)}</p>
                      <Link
                        href={item.traceHref}
                        className="mt-2 inline-flex rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                      >
                        查看轨迹
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </>
      ) : null}
    </>
  )
}
