'use client'
import { useState } from 'react'
import { PageHeader, Card, useToast } from '@/components/admin/ui'

interface ExportItem {
  id: string
  label: string
  desc: string
  icon: string
  color: string
  bg: string
  border: string
}

const EXPORTS: ExportItem[] = [
  {
    id: 'full',
    label: '完整备份',
    desc: '导出所有数据（文章、评论、留言、打赏、设置、访问记录）',
    icon: '🗃️',
    color: 'text-slate-800',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
  },
  {
    id: 'articles',
    label: '文章 + 评论',
    desc: '所有文章内容（含密码 hash）及其评论',
    icon: '📄',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  {
    id: 'comments',
    label: '评论',
    desc: '全部评论记录，含审核状态',
    icon: '💬',
    color: 'text-violet-700',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
  },
  {
    id: 'guestbook',
    label: '留言板',
    desc: '访客留言及 IP 地理信息',
    icon: '📮',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  {
    id: 'payments',
    label: '打赏记录',
    desc: '所有订单及金额，含 Stripe Session ID',
    icon: '💳',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  {
    id: 'settings',
    label: '网站设置',
    desc: '所有配置项（加密密钥不导出明文，仅导出占位符）',
    icon: '⚙️',
    color: 'text-slate-600',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
  },
]

export default function BackupPage() {
  const toast = useToast()
  const [loading, setLoading] = useState<string | null>(null)
  const [lastBackup, setLastBackup] = useState<Record<string, string>>({})

  async function doExport(type: string) {
    if (loading) return
    setLoading(type)
    try {
      const res = await fetch(`/api/admin/backup?type=${type}`)
      if (!res.ok) {
        const err = await res.json()
        toast(err.error ?? '导出失败', 'error')
        return
      }

      // 从响应头读文件名
      const disposition = res.headers.get('Content-Disposition') ?? ''
      const match = disposition.match(/filename="([^"]+)"/)
      const filename = match?.[1] ?? `backup_${type}.json`

      // 触发下载
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      const now = new Date().toLocaleString('zh-CN')
      setLastBackup(prev => ({ ...prev, [type]: now }))
      toast(`${EXPORTS.find(e => e.id === type)?.label ?? type} 已导出`)
    } catch {
      toast('网络错误，导出失败', 'error')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="备份与导出"
        subtitle="将数据导出为 JSON 文件，可用于迁移或存档"
      />

      {/* 说明卡片 */}
      <Card className="p-4 mb-6 border-amber-100 bg-amber-50">
        <div className="flex gap-3">
          <span className="text-xl flex-shrink-0">💡</span>
          <div className="text-sm text-amber-800 space-y-1">
            <p className="font-medium">使用说明</p>
            <ul className="text-amber-700 space-y-0.5 list-disc list-inside">
              <li>所有导出文件为标准 JSON 格式，可直接打开查看</li>
              <li>Stripe 私钥、Webhook 密钥等敏感字段<strong>不会</strong>导出明文</li>
              <li>建议每周做一次完整备份，迁移服务器前务必备份</li>
              <li>文章密码以 bcrypt hash 形式导出，无法反推原始密码</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* 导出项列表 */}
      <div className="space-y-3">
        {EXPORTS.map(item => (
          <Card key={item.id} className={`border ${item.border}`}>
            <div className="p-4 flex items-center gap-4">
              {/* 图标 */}
              <div className={`w-11 h-11 rounded-xl ${item.bg} flex items-center justify-center text-xl flex-shrink-0`}>
                {item.icon}
              </div>

              {/* 描述 */}
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm ${item.color}`}>{item.label}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.desc}</p>
                {lastBackup[item.id] && (
                  <p className="text-[11px] text-slate-400 mt-1">
                    ✓ 上次导出：{lastBackup[item.id]}
                  </p>
                )}
              </div>

              {/* 导出按钮 */}
              <button
                onClick={() => doExport(item.id)}
                disabled={loading !== null}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                  border transition-all
                  ${item.id === 'full'
                    ? 'bg-slate-800 text-white border-slate-800 hover:bg-slate-700 disabled:opacity-50'
                    : `${item.bg} ${item.color} ${item.border} hover:brightness-95 disabled:opacity-50`
                  }`}
              >
                {loading === item.id ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    <span>导出中…</span>
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M7 1v8M4 6l3 3 3-3M1 10v1a2 2 0 002 2h8a2 2 0 002-2v-1"
                        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>导出</span>
                  </>
                )}
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* 底部提示 */}
      <p className="text-xs text-slate-400 text-center mt-6">
        导出的 JSON 文件将直接下载到本地，不经过任何第三方服务
      </p>
    </div>
  )
}
