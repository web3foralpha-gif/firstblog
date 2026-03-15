import { prisma } from '@/lib/prisma'
import { formatGeo } from '@/lib/geo'

export const metadata = { title: '访问统计' }
export const dynamic = 'force-dynamic'

function formatDuration(seconds: number | null) {
  if (!seconds) return '—'
  if (seconds < 60) return `${seconds} 秒`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m} 分 ${s} 秒` : `${m} 分钟`
}

export default async function AdminAnalyticsPage() {
  const [totalViews, avgDurationResult, topPages, recentViews, geoStats] = await Promise.all([
    // 总访问次数
    prisma.pageView.count(),

    // 平均停留时长（排除未离开的）
    prisma.pageView.aggregate({
      where: { duration: { not: null } },
      _avg: { duration: true },
      _count: { duration: true },
    }),

    // 最热门的页面 Top 10
    prisma.pageView.groupBy({
      by: ['path'],
      _count: { id: true },
      _avg: { duration: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }),

    // 最近 30 条访问记录
    prisma.pageView.findMany({
      orderBy: { enteredAt: 'desc' },
      take: 30,
    }),

    // 地区分布 Top 10
    prisma.pageView.groupBy({
      by: ['ipRegion', 'ipCity'],
      where: { ipRegion: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }),
  ])

  const avgDuration = avgDurationResult._avg.duration
  const withDurationCount = avgDurationResult._count.duration

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-2xl font-medium text-[#221e1a]">访问统计</h1>
        <p className="text-sm text-[#a89880] mt-1">访客 IP 及浏览时长，仅管理员可见</p>
      </div>

      {/* 概览数字 */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-[#eeedfe] rounded-xl p-4">
          <p className="text-sm text-[#5a4f42] mb-1">总访问次数</p>
          <p className="text-3xl font-medium text-[#534ab7]">{totalViews.toLocaleString()}</p>
        </div>
        <div className="bg-[#eaf3de] rounded-xl p-4">
          <p className="text-sm text-[#5a4f42] mb-1">平均停留时长</p>
          <p className="text-3xl font-medium text-[#3b6d11]">{formatDuration(Math.round(avgDuration ?? 0))}</p>
          <p className="text-xs text-[#8c7d68] mt-0.5">基于 {withDurationCount} 条有效记录</p>
        </div>
        <div className="bg-[#faeeda] rounded-xl p-4">
          <p className="text-sm text-[#5a4f42] mb-1">覆盖地区数</p>
          <p className="text-3xl font-medium text-[#854f0b]">{geoStats.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* 热门页面 */}
        <div className="card p-5">
          <h2 className="font-medium text-[15px] text-[#221e1a] mb-4">热门页面 Top 10</h2>
          <div className="space-y-2">
            {topPages.map((p, i) => (
              <div key={p.path} className="flex items-center gap-3 py-1.5 border-b border-[#f0ebe3] last:border-0">
                <span className="text-xs text-[#c4b8a7] w-5 flex-shrink-0">{i + 1}</span>
                <span className="text-sm text-[#3d3530] flex-1 truncate font-mono text-xs">{p.path}</span>
                <span className="text-xs text-[#d4711a] font-medium flex-shrink-0">{p._count.id} 次</span>
                <span className="text-xs text-[#a89880] flex-shrink-0">{formatDuration(Math.round(p._avg.duration ?? 0))}</span>
              </div>
            ))}
            {topPages.length === 0 && <p className="text-sm text-[#a89880] text-center py-4">暂无数据</p>}
          </div>
        </div>

        {/* 地区分布 */}
        <div className="card p-5">
          <h2 className="font-medium text-[15px] text-[#221e1a] mb-4">访客地区分布</h2>
          <div className="space-y-2">
            {geoStats.map((g, i) => {
              const label = [g.ipRegion, g.ipCity].filter(Boolean).join(' · ') || '未知'
              const pct = totalViews > 0 ? Math.round((g._count.id / totalViews) * 100) : 0
              return (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#5a4f42]">{label}</span>
                    <span className="text-xs text-[#a89880]">{g._count.id} 次 · {pct}%</span>
                  </div>
                  <div className="w-full bg-[#f0ebe3] rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-[#5aaa28]" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
            {geoStats.length === 0 && <p className="text-sm text-[#a89880] text-center py-4">暂无数据</p>}
          </div>
        </div>
      </div>

      {/* 最近访问记录 */}
      <div className="card p-5">
        <h2 className="font-medium text-[15px] text-[#221e1a] mb-4">最近访问记录</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#f0ebe3]">
                <th className="text-left py-2 px-3 text-xs text-[#8c7d68] font-medium">页面</th>
                <th className="text-left py-2 px-3 text-xs text-[#8c7d68] font-medium">IP 地址</th>
                <th className="text-left py-2 px-3 text-xs text-[#8c7d68] font-medium">地区</th>
                <th className="text-left py-2 px-3 text-xs text-[#8c7d68] font-medium">停留时长</th>
                <th className="text-left py-2 px-3 text-xs text-[#8c7d68] font-medium">时间</th>
              </tr>
            </thead>
            <tbody>
              {recentViews.map(v => (
                <tr key={v.id} className="border-b border-[#f0ebe3] hover:bg-[#faf8f5]">
                  <td className="py-2 px-3 font-mono text-xs text-[#5a4f42] max-w-[140px] truncate">{v.path}</td>
                  <td className="py-2 px-3 font-mono text-xs text-[#a89880]">{v.ipAddress || '—'}</td>
                  <td className="py-2 px-3 text-xs text-[#5a4f42]">
                    {[v.ipRegion, v.ipCity].filter(Boolean).join(' · ') || '未知'}
                  </td>
                  <td className="py-2 px-3 text-xs">
                    {v.duration != null
                      ? <span className="text-[#3b6d11]">{formatDuration(v.duration)}</span>
                      : <span className="text-[#c4b8a7]">浏览中…</span>
                    }
                  </td>
                  <td className="py-2 px-3 text-xs text-[#a89880]">
                    {new Date(v.enteredAt).toLocaleString('zh-CN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {recentViews.length === 0 && <p className="text-sm text-[#a89880] text-center py-8">暂无访问记录</p>}
        </div>
      </div>
    </div>
  )
}
