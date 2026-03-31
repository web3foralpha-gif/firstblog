'use client'
import type { Prisma } from '@prisma/client'
import { useState, useEffect, useCallback } from 'react'
import { PageHeader, Card, useToast, useConfirm } from '@/components/houtai/ui'
import { describeDevice, sanitizeDeviceInfo } from '@/lib/device-info'

interface SfState {
  stage: number; name: string; emoji: string
  totalCount: number; progressCurrent: number; progressMax: number; progressPct: number
  isMax: boolean; nextNeeded: number
  unavailable?: boolean
  message?: string
}
interface Interaction {
  id: string; action: string; ipHash: string; createdAt: string
  ipAddress?: string
  ipCountry?: string
  ipRegion?: string; ipCity?: string
  ipIsp?: string
  userAgent?: string
  deviceInfo?: Prisma.JsonValue | null
}

const STAGE_NAMES = ['种子','发芽','长茎','长叶','花骨朵','盛开']
const ACTION_LABELS: Record<string, string> = { water: '💧 浇水', fertilize: '💩 施肥', sun: '☀️ 晒太阳' }

function formatLocation(log: Interaction) {
  const parts = [log.ipCountry, log.ipRegion, log.ipCity].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : '地区待识别'
}

function formatIpHash(ipHash: string) {
  if (!ipHash) return '未记录指纹'
  if (ipHash.length <= 14) return ipHash
  return `${ipHash.slice(0, 8)}…${ipHash.slice(-6)}`
}

export default function SunflowerAdminPage() {
  const toast = useToast()
  const { confirm, dialog } = useConfirm()
  const [sf, setSf]           = useState<SfState | null>(null)
  const [logs, setLogs]       = useState<Interaction[]>([])
  const [loading, setLoading] = useState(true)
  const [warning, setWarning] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [sfRes, logsRes] = await Promise.all([
        fetch('/api/sunflower'),
        fetch('/api/houtai/sunflower'),
      ])
      const sfData = sfRes.ok ? await sfRes.json() : null
      const logsData = logsRes.ok ? await logsRes.json() : null

      if (sfData) {
        setSf(sfData)
        setWarning(sfData.unavailable ? (sfData.message || '向日葵数据库暂时不可用。') : null)
      }

      if (logsData) {
        setLogs(logsData.interactions ?? [])
        if (logsData.unavailable) {
          setWarning(logsData.message || '向日葵数据库暂时不可用。')
        }
      }
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function reset() {
    const ok = await confirm(
      '重置向日葵',
      '重置后所有进度将归零，回到种子阶段，所有互动记录也会清除。确定吗？',
      { danger: true, confirmLabel: '确认重置' }
    )
    if (!ok) return
    const res = await fetch('/api/houtai/sunflower', { method: 'DELETE' })
    if (res.ok) { toast('已重置向日葵 🌱'); load() }
    else toast('重置失败', 'error')
  }

  const progressW = sf ? Math.round(sf.progressPct) : 0

  return (
    <div>
      {dialog}
      <PageHeader title="向日葵" subtitle="互动数据管理" />

      {warning && (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {warning}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-5 mb-6">
        {/* 当前状态大卡片 */}
        <Card className="lg:col-span-2 p-6">
          {loading ? (
            <div className="h-40 flex items-center justify-center text-slate-400">加载中…</div>
          ) : sf ? (
            <div className="flex items-center gap-6">
              <div className="text-7xl flex-shrink-0">{sf.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-2xl font-semibold text-slate-800">{sf.name}</h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200">
                    第 {sf.stage + 1} 阶段 / 共 6 阶段
                  </span>
                </div>
                <p className="text-slate-500 text-sm mb-4">已有 <strong className="text-slate-700">{sf.totalCount}</strong> 人参与照顾</p>
                {!sf.isMax && (
                  <>
                    <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                      <span>阶段进度</span>
                      <span>还需 {sf.nextNeeded} 人 → {STAGE_NAMES[sf.stage + 1] ?? '完成'}</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-700"
                        style={{ width: `${progressW}%` }} />
                    </div>
                    <p className="text-right text-xs text-slate-400 mt-1">{progressW}%</p>
                  </>
                )}
                {sf.isMax && (
                  <p className="text-emerald-600 font-medium text-sm">🎉 已达到最高阶段！</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-slate-400 text-center py-8">暂无数据</p>
          )}
        </Card>

        {/* 阶段里程碑 */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">成长里程碑</h3>
          <div className="space-y-3">
            {[['🌰','种子',0],['🌱','发芽',10],['🌿','长茎',100],['🍃','长叶',200],['🌼','花骨朵',300],['🌻','盛开',500]].map(([emoji,name,threshold], i) => (
              <div key={i} className={`flex items-center gap-3 ${sf && sf.stage >= i ? '' : 'opacity-35'}`}>
                <span className="text-xl">{emoji}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700">{name as string}</p>
                  <p className="text-xs text-slate-400">{threshold} 人解锁</p>
                </div>
                {sf && sf.stage >= i && <span className="text-emerald-500 text-sm">✓</span>}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 最近互动 */}
      <Card className="mb-6">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-700">最近互动记录</h3>
          <span className="text-xs text-slate-400">最近 50 条</span>
        </div>
        <div className="divide-y divide-slate-50">
          {logs.length === 0 ? (
            <p className="py-8 text-center text-slate-400 text-sm">暂无互动记录</p>
          ) : logs.slice(0, 50).map((log, i) => {
            const deviceProfile = describeDevice(log.userAgent, sanitizeDeviceInfo(log.deviceInfo))
            const ipText = log.ipAddress?.trim() || '旧记录未采集 IP'

            return (
              <div
                key={log.id ?? i}
                className="grid gap-3 px-4 py-3 transition-colors hover:bg-slate-50/50 md:grid-cols-[140px_minmax(0,1fr)_96px]"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-base">{ACTION_LABELS[log.action]?.split(' ')[0] ?? '❓'}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700">{ACTION_LABELS[log.action] ?? log.action}</p>
                    <p className="mt-1 text-xs text-slate-400">{formatLocation(log)}</p>
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-[11px] text-slate-600">
                      {ipText}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-500">
                      指纹 {formatIpHash(log.ipHash)}
                    </span>
                    {log.ipIsp ? (
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-500">
                        {log.ipIsp}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{deviceProfile.summary || '设备待识别'}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {deviceProfile.detail || (log.userAgent?.trim() ? log.userAgent : '旧记录未采集设备详情')}
                  </p>
                </div>

                <div className="shrink-0 text-right text-xs text-slate-400">
                  {new Date(log.createdAt).toLocaleString('zh-CN', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' })}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* 危险区 */}
      <Card className="border-red-100">
        <div className="p-5 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-red-700">重置向日葵</h3>
            <p className="text-sm text-slate-500 mt-0.5">所有进度归零，回到种子阶段，互动记录全部清除。</p>
          </div>
          <button onClick={reset}
            className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors flex-shrink-0">
            重置
          </button>
        </div>
      </Card>
    </div>
  )
}
