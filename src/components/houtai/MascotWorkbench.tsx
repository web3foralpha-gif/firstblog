'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'

import { Card, useToast } from '@/components/houtai/ui'

type MascotWorkbenchProps = {
  draftSettings: Record<string, string>
}

type PreviewTone = 'good' | 'warn'

type MascotPreview = {
  mode: 'pet' | 'twin'
  personaName: string
  aiEnabled: boolean
  apiBase: string
  model: string
  apiKeyConfigured: boolean
  systemPrompt: string
  recentArticles: Array<{
    title: string
    slug: string
    excerpt: string | null
    createdAt: string
  }>
  counts: {
    identityProfile: number
    effectiveIdentityProfile: number
    knowledgeBase: number
    replyStyle: number
    manualPrompt: number
  }
  checklist: Array<{
    tone: PreviewTone
    label: string
    detail: string
  }>
}

function ToneBadge({ tone, children }: { tone: PreviewTone; children: ReactNode }) {
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
        tone === 'good'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-amber-200 bg-amber-50 text-amber-700'
      }`}
    >
      {children}
    </span>
  )
}

export default function MascotWorkbench({ draftSettings }: MascotWorkbenchProps) {
  const toast = useToast()
  const [preview, setPreview] = useState<MascotPreview | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const [testMessage, setTestMessage] = useState('介绍一下你自己吧。')
  const [testReply, setTestReply] = useState('')
  const [testing, setTesting] = useState(false)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null)

  const payload = useMemo(() => ({ draft: draftSettings }), [draftSettings])

  async function loadPreview() {
    setLoadingPreview(true)
    try {
      const res = await fetch('/api/houtai/mascot/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.preview) {
        throw new Error(data?.error || '数字分身体检读取失败')
      }
      setPreview(data.preview)
      setLastUpdatedAt(Date.now())
    } catch (error) {
      toast(error instanceof Error ? error.message : '数字分身体检读取失败', 'error')
    } finally {
      setLoadingPreview(false)
    }
  }

  async function runTest() {
    if (!testMessage.trim()) {
      toast('请先输入一条测试消息', 'error')
      return
    }

    setTesting(true)
    try {
      const res = await fetch('/api/houtai/mascot/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, message: testMessage }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error || '试聊失败')
      }
      setTestReply(typeof data?.reply === 'string' ? data.reply : '')
      if (data?.preview) {
        setPreview(data.preview)
        setLastUpdatedAt(Date.now())
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : '试聊失败', 'error')
    } finally {
      setTesting(false)
    }
  }

  useEffect(() => {
    void loadPreview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-5 xl:col-span-2">
      <Card className="border border-slate-200 bg-slate-50 p-5 shadow-none">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-3xl">
            <h3 className="text-sm font-semibold text-slate-800">数字分身工作台</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              这里会基于当前页面上的草稿做体检和试聊，不用先保存也能检查提示词是否顺、模型是否通。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadPreview()}
              disabled={loadingPreview}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingPreview ? '刷新中…' : '刷新体检'}
            </button>
            <button
              type="button"
              onClick={() => setShowPrompt(current => !current)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            >
              {showPrompt ? '收起提示词' : '查看提示词'}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-slate-200">使用当前草稿</span>
          {lastUpdatedAt ? (
            <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-slate-200">
              最近刷新 {new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit' }).format(lastUpdatedAt)}
            </span>
          ) : null}
        </div>

        {preview ? (
          <>
            <div className="mt-5 flex flex-wrap gap-2">
              <ToneBadge tone={preview.mode === 'twin' ? 'good' : 'warn'}>
                {preview.mode === 'twin' ? '数字分身模式' : '宠物模式'}
              </ToneBadge>
              <ToneBadge tone={preview.aiEnabled ? 'good' : 'warn'}>
                {preview.aiEnabled ? 'AI 已开启' : 'AI 未开启'}
              </ToneBadge>
              <ToneBadge tone={preview.apiKeyConfigured ? 'good' : 'warn'}>
                {preview.apiKeyConfigured ? 'API Key 已配置' : 'API Key 未配置'}
              </ToneBadge>
              <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">
                模型 {preview.model}
              </span>
              <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200">
                {preview.personaName}
              </span>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">身份资料</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{preview.counts.identityProfile}</p>
                <p className="mt-1 text-xs text-slate-500">有效画像 {preview.counts.effectiveIdentityProfile} 字</p>
              </div>
              <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">知识库</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{preview.counts.knowledgeBase}</p>
                <p className="mt-1 text-xs text-slate-500">建议持续补充常见问答</p>
              </div>
              <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">回复风格</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{preview.counts.replyStyle}</p>
                <p className="mt-1 text-xs text-slate-500">决定整体口吻和边界</p>
              </div>
              <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">追加要求</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{preview.counts.manualPrompt}</p>
                <p className="mt-1 text-xs text-slate-500">用于补充高优先级规则</p>
              </div>
              <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">公开文章</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{preview.recentArticles.length}</p>
                <p className="mt-1 text-xs text-slate-500">用于推荐和引用</p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                <p className="text-sm font-semibold text-slate-800">当前体检结果</p>
                <div className="mt-3 space-y-3">
                  {preview.checklist.map(item => (
                    <div key={`${item.label}-${item.detail}`} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <ToneBadge tone={item.tone}>{item.label}</ToneBadge>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                <p className="text-sm font-semibold text-slate-800">近期公开文章上下文</p>
                {preview.recentArticles.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-400">还没有可引用的公开文章。</p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {preview.recentArticles.slice(0, 4).map(article => (
                      <div key={article.slug} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-slate-800">{article.title}</p>
                          <span className="text-[11px] text-slate-400">{article.createdAt}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">/article/{article.slug}</p>
                        {article.excerpt ? <p className="mt-2 text-sm leading-6 text-slate-500">{article.excerpt}</p> : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {showPrompt ? (
              <div className="mt-5 rounded-2xl bg-slate-950 p-4 text-slate-100 ring-1 ring-slate-800">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">当前会送给模型的系统提示词</p>
                  <span className="text-xs text-slate-400">{preview.systemPrompt.length} 字</span>
                </div>
                <textarea
                  readOnly
                  className="min-h-[280px] w-full resize-y rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 font-mono text-xs leading-6 text-slate-100 outline-none"
                  value={preview.systemPrompt}
                />
              </div>
            ) : null}
          </>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-200 px-6 py-12 text-center text-sm text-slate-400">
            先点一次“刷新体检”，这里就会显示数字分身的配置状态。
          </div>
        )}
      </Card>

      <Card className="border border-slate-200 bg-slate-50 p-5 shadow-none">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">后台试聊</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              用当前草稿临时试一句，能立刻看出模型接口、人设和语气有没有跑偏。
            </p>
          </div>
          <button
            type="button"
            onClick={() => void runTest()}
            disabled={testing}
            className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {testing ? '试聊中…' : '发送测试'}
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <textarea
            className="field resize-y"
            rows={4}
            value={testMessage}
            onChange={event => setTestMessage(event.target.value)}
            placeholder="比如：介绍一下你自己吧。"
          />
          {testReply ? (
            <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Reply Preview</p>
              <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{testReply}</div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-400">
              这里会显示数字分身的测试回复。
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
