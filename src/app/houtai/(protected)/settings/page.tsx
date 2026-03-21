'use client'
import { useState, useEffect, useCallback } from 'react'
import FileUploader from '@/components/houtai/FileUploader'
import { PageHeader, Card, useToast, useConfirm } from '@/components/houtai/ui'

type TabId = 'basic' | 'blog' | 'about' | 'payment' | 'ui' | 'security' | 'ai'

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'basic', label: '基础设置', icon: '🌐' },
  { id: 'blog', label: '博客首页', icon: '📝' },
  { id: 'about', label: '关于页', icon: '👤' },
  { id: 'payment', label: '支付设置', icon: '💳' },
  { id: 'ui', label: '互动文案', icon: '💬' },
  { id: 'security', label: '安全设置', icon: '🔒' },
  { id: 'ai', label: 'AI宠物', icon: '🤖' },
]

const TAB_KEYS: Record<TabId, string[]> = {
  basic: [
    'site.title',
    'site.description',
    'site.keywords',
    'site.favicon',
    'site.googleVerification',
    'site.bingVerification',
    'site.baiduVerification',
    'site.yandexVerification',
    'site.pageSize',
    'site.commentReview',
    'site.guestbookReview',
  ],
  blog: [
    'blog.homeTitle',
    'blog.homeDescription',
    'blog.cornerTitle',
    'blog.cornerContent',
    'blog.quickLinksTitle',
    'blog.quickLinkAboutLabel',
    'blog.quickLinkAboutHref',
    'blog.quickLinkGuestbookLabel',
    'blog.quickLinkGuestbookHref',
    'blog.footerText',
    'blog.friendLinksTitle',
    'blog.friendLinks',
    'blog.themeVariant',
  ],
  about: [
    'blog.aboutTitle',
    'blog.aboutSubtitle',
    'blog.aboutAvatar',
    'blog.aboutCoverImage',
    'blog.aboutContent',
    'blog.aboutContactsTitle',
    'blog.aboutContacts',
  ],
  payment: ['pay.enabled', 'pay.currency', 'pay.stripePublicKey', 'pay.stripeSecretKey', 'pay.stripeWebhookKey'],
  ui: ['ui.pikaSaluteText', 'ui.pikaClickText', 'ui.pikaPhrases', 'ui.sfWaterText', 'ui.sfFertilizeText', 'ui.sfSunText', 'ui.sfDoneText'],
  security: ['admin.email'],
  ai: ['mascot.aiEnabled', 'mascot.aiApiBase', 'mascot.aiModel', 'mascot.aiApiKey', 'mascot.systemPrompt', 'mascot.chatEnabled', 'mascot.chatPlaceholder'],
}

type SettingDef = {
  type: string
  label: string
  default?: string
}

function Toggle({ v, onChange }: { v: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!v)}
      className="mt-1.5"
      style={{ position: 'relative', display: 'inline-flex', width: 44, height: 24, borderRadius: 12, background: v ? '#6366f1' : '#cbd5e1', border: 'none', cursor: 'pointer', transition: 'background .2s', padding: 0 }}
    >
      <span style={{ position: 'absolute', top: 3, left: v ? 23 : 3, width: 18, height: 18, borderRadius: 9, background: '#fff', transition: 'left .18s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
    </button>
  )
}

function FormRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[160px_1fr] sm:gap-4">
      <div className="pt-0 sm:pt-2">
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
      </div>
      <div>{children}</div>
    </div>
  )
}

function ImageSettingField({
  label,
  hint,
  value,
  onChange,
  uploadLabel,
}: {
  label: string
  hint?: string
  value: string
  onChange: (value: string) => void
  uploadLabel: string
}) {
  const [showUploader, setShowUploader] = useState(false)

  return (
    <FormRow label={label} hint={hint}>
      <div className="space-y-3">
        {value ? (
          <div className="overflow-hidden rounded-2xl border border-[#ddd5c8] bg-white">
            <img src={value} alt={label} className="max-h-64 w-full object-cover" />
          </div>
        ) : null}

        <input
          className="field font-mono text-xs"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="https://..."
          maxLength={1000}
        />

        {showUploader ? (
          <div className="rounded-2xl border border-[#eadfce] bg-[#faf8f5] p-3">
            <FileUploader
              accept="image"
              label={uploadLabel}
              onSuccess={({ url }) => {
                onChange(url)
                setShowUploader(false)
              }}
            />
            <button
              type="button"
              onClick={() => setShowUploader(false)}
              className="mt-2 text-xs text-[#a89880] hover:text-[#5a4f42]"
            >
              取消上传
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowUploader(true)}
              className="rounded-xl border border-[#ddd5c8] bg-white px-3 py-2 text-sm text-[#5a4f42] transition-colors hover:border-[#d4711a] hover:text-[#d4711a]"
            >
              上传图片
            </button>
            {value ? (
              <button
                type="button"
                onClick={() => onChange('')}
                className="rounded-xl border border-[#f1d0cb] bg-[#fff7f6] px-3 py-2 text-sm text-[#b4533b] transition-colors hover:border-[#dc8c7c]"
              >
                清空
              </button>
            ) : null}
          </div>
        )}
      </div>
    </FormRow>
  )
}

export default function SettingsPage() {
  const toast = useToast()
  const { confirm, dialog } = useConfirm()
  const [tab, setTab] = useState<TabId>('basic')
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [defs, setDefs] = useState<Record<string, SettingDef>>({})
  const [dirty, setDirty] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [newPw2, setNewPw2] = useState('')
  const [pwSaving, setPwSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/houtai/settings')
    if (res.ok) {
      const data = await res.json()
      setSettings(data.settings)
      setDefs(data.defs)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const getVal = (key: string) => dirty[key] !== undefined ? dirty[key] : (settings[key] ?? defs[key]?.default ?? '')
  const setVal = (key: string, val: string) => setDirty(current => ({ ...current, [key]: val }))

  async function save() {
    const keys = TAB_KEYS[tab]
    const payload = Object.fromEntries(keys.filter(key => dirty[key] !== undefined).map(key => [key, dirty[key]]))
    if (Object.keys(payload).length === 0) {
      toast('没有修改', 'info')
      return
    }

    setSaving(true)
    const res = await fetch('/api/houtai/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setSaving(false)

    if (res.ok) {
      toast('保存成功')
      setSettings(current => ({ ...current, ...payload }))
      setDirty({})
    } else {
      toast('保存失败', 'error')
    }
  }

  async function changePassword() {
    if (!oldPw || !newPw || !newPw2) {
      toast('请填写所有字段', 'error')
      return
    }
    if (newPw !== newPw2) {
      toast('两次新密码不一致', 'error')
      return
    }
    if (newPw.length < 8) {
      toast('新密码至少 8 位', 'error')
      return
    }

    const ok = await confirm('修改密码', '确认修改管理员密码？', { confirmLabel: '确认修改' })
    if (!ok) return

    setPwSaving(true)
    const res = await fetch('/api/houtai/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPassword: oldPw, newPassword: newPw }),
    })
    const data = await res.json()
    setPwSaving(false)

    if (res.ok) {
      toast(data.message ?? '管理员密码已更新')
      setOldPw('')
      setNewPw('')
      setNewPw2('')
    } else {
      toast(data.error ?? '操作失败', 'error')
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-400">加载中…</div>
  }

  const dirtyCount = Object.keys(dirty).filter(key => TAB_KEYS[tab].includes(key)).length

  return (
    <div className="max-w-2xl">
      {dialog}
      <PageHeader title="网站设置" />

      <div className="flex gap-1 mb-5 bg-slate-100 rounded-xl p-1">
        {TABS.map(item => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all ${tab === item.id ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <span className="mr-1 hidden sm:inline">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>

      <Card className="p-6">
        {tab === 'basic' && (
          <div className="space-y-5">
            <FormRow label="网站标题">
              <input className="field" value={getVal('site.title')} onChange={e => setVal('site.title', e.target.value)} maxLength={100} />
            </FormRow>
            <FormRow label="SEO 描述">
              <textarea className="field resize-none" rows={3} value={getVal('site.description')} onChange={e => setVal('site.description', e.target.value)} maxLength={300} />
            </FormRow>
            <FormRow label="SEO 关键词" hint="用英文逗号分隔，例如：Web3, 区块链, 个人博客">
              <input className="field" value={getVal('site.keywords')} onChange={e => setVal('site.keywords', e.target.value)} maxLength={500} />
            </FormRow>
            <ImageSettingField
              label="标签页图标"
              hint="会显示在浏览器标签页，建议上传 256x256 以上的 PNG、ICO 或 SVG 正方形图标"
              value={getVal('site.favicon')}
              onChange={value => setVal('site.favicon', value)}
              uploadLabel="上传标签页图标（建议正方形）"
            />
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">站长平台验证</p>
              <div className="mt-4 space-y-5">
                <FormRow label="Google 验证码" hint="填写 Search Console 提供的 content 值，不用粘贴整段 meta 标签">
                  <input className="field font-mono text-xs" value={getVal('site.googleVerification')} onChange={e => setVal('site.googleVerification', e.target.value)} placeholder="google-site-verification=..." maxLength={300} />
                </FormRow>
                <FormRow label="Bing 验证码" hint="填写 Bing Webmaster Tools 提供的 content 值">
                  <input className="field font-mono text-xs" value={getVal('site.bingVerification')} onChange={e => setVal('site.bingVerification', e.target.value)} placeholder="xxxxxxxx" maxLength={300} />
                </FormRow>
                <FormRow label="百度验证码" hint="填写百度站长平台要求的 content 值">
                  <input className="field font-mono text-xs" value={getVal('site.baiduVerification')} onChange={e => setVal('site.baiduVerification', e.target.value)} placeholder="codeva-xxxxxxxx" maxLength={300} />
                </FormRow>
                <FormRow label="Yandex 验证码" hint="如果不用可留空">
                  <input className="field font-mono text-xs" value={getVal('site.yandexVerification')} onChange={e => setVal('site.yandexVerification', e.target.value)} placeholder="xxxxxxxx" maxLength={300} />
                </FormRow>
              </div>
            </div>
            <FormRow label="每页文章数">
              <input type="number" min={1} max={50} className="field w-24" value={getVal('site.pageSize')} onChange={e => setVal('site.pageSize', e.target.value)} />
            </FormRow>
            <FormRow label="评论需审核">
              <Toggle v={getVal('site.commentReview') === 'true'} onChange={v => setVal('site.commentReview', v ? 'true' : 'false')} />
            </FormRow>
            <FormRow label="留言需审核">
              <Toggle v={getVal('site.guestbookReview') === 'true'} onChange={v => setVal('site.guestbookReview', v ? 'true' : 'false')} />
            </FormRow>
          </div>
        )}

        {tab === 'blog' && (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">博客首页</p>
              <div className="mt-4 space-y-5">
                <FormRow label="列表标题">
                  <input className="field" value={getVal('blog.homeTitle')} onChange={e => setVal('blog.homeTitle', e.target.value)} maxLength={100} />
                </FormRow>
                <FormRow label="列表副标题">
                  <textarea className="field resize-none" rows={3} value={getVal('blog.homeDescription')} onChange={e => setVal('blog.homeDescription', e.target.value)} maxLength={300} />
                </FormRow>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">侧边栏</p>
              <div className="mt-4 space-y-5">
                <FormRow label="小站角落标题">
                  <input className="field" value={getVal('blog.cornerTitle')} onChange={e => setVal('blog.cornerTitle', e.target.value)} maxLength={40} />
                </FormRow>
                <FormRow label="小站角落文案" hint="每行会显示为一段文字">
                  <textarea className="field resize-none" rows={5} value={getVal('blog.cornerContent')} onChange={e => setVal('blog.cornerContent', e.target.value)} maxLength={4000} />
                </FormRow>
                <FormRow label="快速入口标题">
                  <input className="field" value={getVal('blog.quickLinksTitle')} onChange={e => setVal('blog.quickLinksTitle', e.target.value)} maxLength={40} />
                </FormRow>
                <FormRow label="入口一名称">
                  <input className="field" value={getVal('blog.quickLinkAboutLabel')} onChange={e => setVal('blog.quickLinkAboutLabel', e.target.value)} maxLength={30} />
                </FormRow>
                <FormRow label="入口一链接">
                  <input className="field font-mono text-xs" value={getVal('blog.quickLinkAboutHref')} onChange={e => setVal('blog.quickLinkAboutHref', e.target.value)} placeholder="/about" maxLength={500} />
                </FormRow>
                <FormRow label="入口二名称">
                  <input className="field" value={getVal('blog.quickLinkGuestbookLabel')} onChange={e => setVal('blog.quickLinkGuestbookLabel', e.target.value)} maxLength={30} />
                </FormRow>
                <FormRow label="入口二链接">
                  <input className="field font-mono text-xs" value={getVal('blog.quickLinkGuestbookHref')} onChange={e => setVal('blog.quickLinkGuestbookHref', e.target.value)} placeholder="/guestbook" maxLength={500} />
                </FormRow>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">页脚与主题</p>
              <div className="mt-4 space-y-5">
                <FormRow label="页脚文字">
                  <input className="field" value={getVal('blog.footerText')} onChange={e => setVal('blog.footerText', e.target.value)} maxLength={80} />
                </FormRow>
                <FormRow label="友链标题">
                  <input className="field" value={getVal('blog.friendLinksTitle')} onChange={e => setVal('blog.friendLinksTitle', e.target.value)} maxLength={40} />
                </FormRow>
                <FormRow label="友情链接" hint="每行一条，格式：名称|链接">
                  <textarea
                    className="field resize-none font-mono text-xs"
                    rows={6}
                    value={getVal('blog.friendLinks')}
                    onChange={e => setVal('blog.friendLinks', e.target.value)}
                    placeholder={'OpenAI|https://openai.com\nVercel|https://vercel.com'}
                    maxLength={4000}
                  />
                </FormRow>
                <FormRow label="前台主题" hint="可切换为暖色、喜庆、黑白、极光、海洋或玫瑰风格">
                  <select className="field" value={getVal('blog.themeVariant')} onChange={e => setVal('blog.themeVariant', e.target.value)}>
                    <option value="warm">暖色日常</option>
                    <option value="festival">过年喜庆</option>
                    <option value="memorial">悼念黑白</option>
                    <option value="aurora">极光梦境</option>
                    <option value="ocean">海盐蓝调</option>
                    <option value="rose">玫瑰晚霞</option>
                  </select>
                </FormRow>
              </div>
            </div>
          </div>
        )}

        {tab === 'about' && (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">关于页</p>
              <div className="mt-4 space-y-5">
                <FormRow label="页面标题" hint="会显示在 /about 页的大标题位置">
                  <input
                    className="field"
                    value={getVal('blog.aboutTitle')}
                    onChange={e => setVal('blog.aboutTitle', e.target.value)}
                    placeholder="关于我"
                    maxLength={120}
                  />
                </FormRow>
                <FormRow label="页面副标题" hint="显示在标题下方，可写一句介绍或欢迎语">
                  <input
                    className="field"
                    value={getVal('blog.aboutSubtitle')}
                    onChange={e => setVal('blog.aboutSubtitle', e.target.value)}
                    placeholder="写给偶然路过这里的你。"
                    maxLength={300}
                  />
                </FormRow>
                <ImageSettingField
                  label="头像"
                  hint="建议使用正方形图片，会显示在关于页顶部信息区"
                  value={getVal('blog.aboutAvatar')}
                  onChange={value => setVal('blog.aboutAvatar', value)}
                  uploadLabel="上传头像（建议 800x800 以上的正方形图片）"
                />
                <ImageSettingField
                  label="头图"
                  hint="显示在关于页顶部横幅区域，建议使用宽图"
                  value={getVal('blog.aboutCoverImage')}
                  onChange={value => setVal('blog.aboutCoverImage', value)}
                  uploadLabel="上传头图（建议 1600x900 以上）"
                />
                <FormRow label="页面内容" hint="支持 Markdown，会展示在 /about 页面正文区域">
                  <textarea
                    className="field resize-y min-h-[320px] font-mono text-xs"
                    rows={16}
                    value={getVal('blog.aboutContent')}
                    onChange={e => setVal('blog.aboutContent', e.target.value)}
                    placeholder="介绍一下自己吧..."
                    maxLength={12000}
                  />
                </FormRow>
                <FormRow label="联系区标题" hint="显示在社交链接模块的标题位置">
                  <input
                    className="field"
                    value={getVal('blog.aboutContactsTitle')}
                    onChange={e => setVal('blog.aboutContactsTitle', e.target.value)}
                    placeholder="社交与联系方式"
                    maxLength={120}
                  />
                </FormRow>
                <FormRow label="社交与联系方式" hint="每行一条，格式：名称|链接。支持 https://、mailto:、tel:">
                  <textarea
                    className="field resize-y min-h-[160px] font-mono text-xs"
                    rows={8}
                    value={getVal('blog.aboutContacts')}
                    onChange={e => setVal('blog.aboutContacts', e.target.value)}
                    placeholder={'邮箱|mailto:hello@example.com\n微信频道|https://example.com\n电话|tel:+8613800000000'}
                    maxLength={4000}
                  />
                </FormRow>
              </div>
            </div>
          </div>
        )}

        {tab === 'payment' && (
          <div className="space-y-5">
            <div className="flex gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              <span>⚠️</span>
              <span>私钥会加密存储，页面仅显示掩码。留空时保留原值。</span>
            </div>
            <FormRow label="开启打赏">
              <Toggle v={getVal('pay.enabled') === 'true'} onChange={v => setVal('pay.enabled', v ? 'true' : 'false')} />
            </FormRow>
            <FormRow label="货币代码">
              <select className="field w-28" value={getVal('pay.currency')} onChange={e => setVal('pay.currency', e.target.value)}>
                {['cny', 'usd', 'eur', 'jpy', 'hkd'].map(currency => (
                  <option key={currency} value={currency}>{currency.toUpperCase()}</option>
                ))}
              </select>
            </FormRow>
            <FormRow label="Stripe 公钥">
              <input className="field font-mono text-xs" value={getVal('pay.stripePublicKey')} onChange={e => setVal('pay.stripePublicKey', e.target.value)} placeholder="pk_live_..." />
            </FormRow>
            <FormRow label="Stripe 私钥" hint="加密存储，留空保持原值">
              <input type="password" className="field font-mono text-xs" value={getVal('pay.stripeSecretKey')} onChange={e => setVal('pay.stripeSecretKey', e.target.value)} placeholder="输入新值以更新" />
            </FormRow>
            <FormRow label="Webhook 密钥" hint="加密存储，留空保持原值">
              <input type="password" className="field font-mono text-xs" value={getVal('pay.stripeWebhookKey')} onChange={e => setVal('pay.stripeWebhookKey', e.target.value)} placeholder="输入新值以更新" />
            </FormRow>
          </div>
        )}

        {tab === 'ui' && (
          <div className="space-y-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">皮卡丘</p>
            <FormRow label="悬停气泡文字">
              <input className="field" value={getVal('ui.pikaSaluteText')} onChange={e => setVal('ui.pikaSaluteText', e.target.value)} maxLength={20} />
            </FormRow>
            <FormRow label="点击台词" hint="用 | 分隔，随机选一条">
              <textarea className="field resize-none font-mono text-xs" rows={4} value={getVal('ui.pikaPhrases')} onChange={e => setVal('ui.pikaPhrases', e.target.value)} />
            </FormRow>
            <div className="pt-2 border-t border-slate-100" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">向日葵</p>
            {[['ui.sfWaterText', '浇水反馈'], ['ui.sfFertilizeText', '施肥反馈'], ['ui.sfSunText', '晒太阳反馈'], ['ui.sfDoneText', '重复互动提示']].map(([key, label]) => (
              <FormRow key={key} label={label}>
                <input className="field" value={getVal(key)} onChange={e => setVal(key, e.target.value)} maxLength={60} />
              </FormRow>
            ))}
          </div>
        )}

        {tab === 'security' && (
          <div className="space-y-5">
            <div className="flex gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
              <span>🔐</span>
              <span>管理员邮箱会直接作为下次登录账号使用；修改密码后立即生效，建议保存后重新登录确认。</span>
            </div>
            <FormRow label="管理员邮箱">
              <input
                type="email"
                className="field"
                value={getVal('admin.email')}
                onChange={e => setVal('admin.email', e.target.value)}
                autoComplete="email"
                placeholder="admin@example.com"
              />
            </FormRow>
            <div className="pt-2 border-t border-slate-100" />
            <FormRow label="旧密码">
              <input type="password" className="field" value={oldPw} onChange={e => setOldPw(e.target.value)} autoComplete="current-password" />
            </FormRow>
            <FormRow label="新密码">
              <input type="password" className="field" value={newPw} onChange={e => setNewPw(e.target.value)} autoComplete="new-password" placeholder="至少 8 位" />
            </FormRow>
            <FormRow label="确认新密码">
              <input type="password" className="field" value={newPw2} onChange={e => setNewPw2(e.target.value)} autoComplete="new-password" />
            </FormRow>
          </div>
        )}

        {tab === 'ai' && (
          <div className="space-y-5">
            <div className="flex gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
              <span>🤖</span>
              <span>配置 OpenAI 兼容接口后，皮卡丘聊天会优先走 AI 回复。API Key 会加密存储，留空则继续使用内置兜底回复。</span>
            </div>
            <FormRow label="启用 AI 对话">
              <Toggle v={getVal('mascot.aiEnabled') === 'true'} onChange={v => setVal('mascot.aiEnabled', v ? 'true' : 'false')} />
            </FormRow>
            <FormRow label="显示聊天入口">
              <Toggle v={getVal('mascot.chatEnabled') !== 'false'} onChange={v => setVal('mascot.chatEnabled', v ? 'true' : 'false')} />
            </FormRow>
            <FormRow label="API Base URL" hint="OpenAI 兼容接口，默认 https://api.openai.com/v1">
              <input className="field font-mono text-xs" value={getVal('mascot.aiApiBase')} onChange={e => setVal('mascot.aiApiBase', e.target.value)} placeholder="https://api.openai.com/v1" />
            </FormRow>
            <FormRow label="模型名称">
              <input className="field font-mono text-xs" value={getVal('mascot.aiModel')} onChange={e => setVal('mascot.aiModel', e.target.value)} placeholder="gpt-4o-mini" />
            </FormRow>
            <FormRow label="API Key" hint="加密存储，留空保持原值">
              <input type="password" className="field font-mono text-xs" value={getVal('mascot.aiApiKey')} onChange={e => setVal('mascot.aiApiKey', e.target.value)} placeholder="sk-..." />
            </FormRow>
            <FormRow label="系统提示词" hint="留空则使用默认皮卡丘人设">
              <textarea className="field resize-none text-xs" rows={4} value={getVal('mascot.systemPrompt')} onChange={e => setVal('mascot.systemPrompt', e.target.value)} placeholder="你是网站吉祥物皮卡丘，性格活泼可爱..." />
            </FormRow>
            <FormRow label="输入框占位文字">
              <input className="field" value={getVal('mascot.chatPlaceholder')} onChange={e => setVal('mascot.chatPlaceholder', e.target.value)} maxLength={30} />
            </FormRow>
          </div>
        )}

        <div className="flex justify-end mt-8 pt-5 border-t border-slate-100">
          {tab !== 'security' ? (
            <div className="flex gap-3 items-center">
              {dirtyCount > 0 && (
                <span className="text-xs text-slate-400">待保存 {dirtyCount} 项</span>
              )}
              {dirtyCount > 0 && (
                <button onClick={() => setDirty({})} className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 transition-colors">
                  撤销
                </button>
              )}
              <button onClick={save} disabled={saving} className="px-5 py-2 rounded-xl bg-slate-800 text-white text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors">
                {saving ? '保存中…' : '保存'}
              </button>
            </div>
          ) : (
            <div className="flex gap-3 items-center">
              {dirtyCount > 0 && (
                <span className="text-xs text-slate-400">待保存 {dirtyCount} 项</span>
              )}
              <button onClick={save} disabled={saving} className="px-5 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">
                {saving ? '保存中…' : '保存邮箱'}
              </button>
              <button onClick={changePassword} disabled={pwSaving} className="px-5 py-2 rounded-xl bg-slate-800 text-white text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors">
                {pwSaving ? '验证中…' : '修改密码'}
              </button>
            </div>
          )}
        </div>
      </Card>

      <style>{`
        .field { width:100%; padding:8px 12px; border:1px solid #e2e8f0; border-radius:10px; font-size:14px; color:#1e293b; background:#f8fafc; outline:none; transition:border-color .15s, box-shadow .15s; }
        .field:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.1); background:#fff; }
      `}</style>
    </div>
  )
}
