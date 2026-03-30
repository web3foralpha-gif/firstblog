'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

import FileUploader from '@/components/houtai/FileUploader'
import MascotWorkbench from '@/components/houtai/MascotWorkbench'
import OwnerDeviceAllowlistButton from '@/components/houtai/OwnerDeviceAllowlistButton'
import { ADMIN_SETTING_SECTIONS, type AdminSettingField, type AdminSettingSection } from '@/components/houtai/admin-settings-config'
import { Card, PageHeader, SearchInput, useConfirm, useToast } from '@/components/houtai/ui'
import { resolveSharedFontStack } from '@/lib/shared-fonts'

type SettingDef = {
  type: string
  label: string
  default?: string
}

type AdminSettingsCenterProps = {
  title?: string
  subtitle?: string
  mode?: 'full' | 'compact'
  fullPageHref?: string
}

const SETTINGS_CENTER_UI_KEY = 'blog-fix:settings-center-ui'

type SettingsSectionMeta = {
  label: string
  tone: string
  note: string
}

function getSectionMeta(sectionId: string): SettingsSectionMeta {
  if (sectionId === 'site') {
    return {
      label: '品牌 / SEO',
      tone: 'border-sky-200 bg-sky-50 text-sky-700',
      note: '搜索引擎、站点识别与标签页表现会直接受影响。',
    }
  }

  if (sectionId === 'payments' || sectionId === 'ai') {
    return {
      label: '服务接入',
      tone: 'border-violet-200 bg-violet-50 text-violet-700',
      note: '这里包含外部平台接入信息，保存前建议再次核对。',
    }
  }

  if (sectionId === 'analytics') {
    return {
      label: '统计治理',
      tone: 'border-amber-200 bg-amber-50 text-amber-700',
      note: '用于剔除站长自测流量，让访问与互动统计更接近真实访客。',
    }
  }

  if (sectionId === 'security') {
    return {
      label: '敏感配置',
      tone: 'border-rose-200 bg-rose-50 text-rose-700',
      note: '涉及后台登录与权限安全，改动后建议立即验证登录流程。',
    }
  }

  return {
    label: '前台展示',
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    note: '会直接影响访客前台看到的内容、文案与视觉表现。',
  }
}

function formatSavedTime(value: number | null | undefined) {
  if (!value) return '未记录'

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function buildSectionHref(basePath: string, currentSearch: string, sectionId?: string | null) {
  const params = new URLSearchParams(currentSearch)

  if (sectionId) {
    params.set('section', sectionId)
  } else {
    params.delete('section')
  }

  const query = params.toString()
  return query ? `${basePath}?${query}` : basePath
}

function ToggleSwitch({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="relative mt-1 inline-flex h-7 w-12 rounded-full transition-colors"
      style={{ background: value ? '#1d4ed8' : '#cbd5e1' }}
    >
      <span
        className="absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all"
        style={{ left: value ? 23 : 4 }}
      />
    </button>
  )
}

function FormRow({
  label,
  hint,
  status,
  actions,
  children,
}: {
  label: string
  hint?: string
  status?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-2 border-b border-slate-100 pb-5 last:border-b-0 last:pb-0 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-5">
      <div className="pt-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-slate-700">{label}</p>
          {status}
        </div>
        {hint ? <p className="mt-1 text-xs leading-5 text-slate-400">{hint}</p> : null}
      </div>
      <div className="space-y-3">
        {children}
        {actions ? <div className="flex flex-wrap justify-end gap-2">{actions}</div> : null}
      </div>
    </div>
  )
}

function ImageSettingField({
  label,
  hint,
  status,
  actions,
  value,
  onChange,
}: {
  label: string
  hint?: string
  status?: React.ReactNode
  actions?: React.ReactNode
  value: string
  onChange: (value: string) => void
}) {
  const [showUploader, setShowUploader] = useState(false)

  return (
    <FormRow label={label} hint={hint} status={status} actions={actions}>
      <div className="space-y-3">
        {value ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <img src={value} alt={label} className="max-h-64 w-full object-cover" />
          </div>
        ) : null}

        <input
          className="field font-mono text-xs"
          value={value}
          onChange={event => onChange(event.target.value)}
          placeholder="https://..."
          maxLength={1000}
        />

        {showUploader ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <FileUploader
              accept="image"
              label={`上传${label}`}
              onSuccess={({ url }) => {
                onChange(url)
                setShowUploader(false)
              }}
            />
            <button
              type="button"
              onClick={() => setShowUploader(false)}
              className="mt-2 text-xs text-slate-500 hover:text-slate-700"
            >
              取消上传
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowUploader(true)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              上传图片
            </button>
            {value ? (
              <button
                type="button"
                onClick={() => onChange('')}
                className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600 transition-colors hover:border-rose-300"
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

function isLongField(field: AdminSettingField) {
  return field.kind === 'textarea' || field.kind === 'image'
}

export default function AdminSettingsCenter({
  title = '前台控制中心',
  subtitle = '把常用前台设置整合成按场景分组的控制面板，后续扩展也只需要在一个地方挂字段。',
  mode = 'full',
  fullPageHref = '/houtai/settings',
}: AdminSettingsCenterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const toast = useToast()
  const { confirm, dialog } = useConfirm()
  const isCompactMode = mode === 'compact'
  const uiStorageKey = `${SETTINGS_CENTER_UI_KEY}:${mode}`
  const currentSearch = searchParams.toString()

  const sections = useMemo(() => ADMIN_SETTING_SECTIONS, [])
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [defs, setDefs] = useState<Record<string, SettingDef>>({})
  const [dirty, setDirty] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [savingTarget, setSavingTarget] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showDirtyOnly, setShowDirtyOnly] = useState(false)
  const [savedSectionTimestamps, setSavedSectionTimestamps] = useState<Record<string, number>>({})
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/houtai/settings', { cache: 'no-store' })
      if (!res.ok) throw new Error('load failed')
      const data = await res.json()
      setSettings(data.settings ?? {})
      setDefs(data.defs ?? {})
    } catch {
      toast('设置读取失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const raw = window.localStorage.getItem(uiStorageKey)
      if (!raw) return

      const parsed = JSON.parse(raw) as {
        showDirtyOnly?: boolean
        savedSectionTimestamps?: Record<string, number>
      }
      if (typeof parsed.showDirtyOnly === 'boolean') {
        setShowDirtyOnly(parsed.showDirtyOnly)
      }
      if (parsed.savedSectionTimestamps && typeof parsed.savedSectionTimestamps === 'object') {
        setSavedSectionTimestamps(parsed.savedSectionTimestamps)
      }
    } catch {
      window.localStorage.removeItem(uiStorageKey)
    }
  }, [uiStorageKey])

  useEffect(() => {
    if (typeof window === 'undefined') return

    window.localStorage.setItem(
      uiStorageKey,
      JSON.stringify({
        showDirtyOnly,
        savedSectionTimestamps,
      }),
    )
  }, [savedSectionTimestamps, showDirtyOnly, uiStorageKey])

  const dirtyKeys = useMemo(() => new Set(Object.keys(dirty)), [dirty])
  const dirtyCount = dirtyKeys.size
  const searchQuery = search.trim().toLowerCase()
  const effectiveSettings = useMemo(() => {
    const merged: Record<string, string> = {}
    const keys = new Set([...Object.keys(defs), ...Object.keys(settings), ...Object.keys(dirty)])

    keys.forEach(key => {
      merged[key] = dirty[key] !== undefined ? dirty[key] : (settings[key] ?? defs[key]?.default ?? '')
    })

    return merged
  }, [defs, dirty, settings])

  function getSettingValue(key: string) {
    return dirty[key] !== undefined ? dirty[key] : (settings[key] ?? defs[key]?.default ?? '')
  }

  function setSettingValue(key: string, value: string) {
    setDirty(current => ({ ...current, [key]: value }))
  }

  function getDirtyKeysForSection(section: AdminSettingSection) {
    return section.fields.map(field => field.key).filter(key => dirtyKeys.has(key))
  }

  function getSavedValue(key: string) {
    return settings[key] ?? defs[key]?.default ?? ''
  }

  function fieldMatchesSearch(section: AdminSettingSection, field: AdminSettingField) {
    if (!searchQuery) return true

    const haystack = [
      section.title,
      section.description,
      field.label,
      field.hint,
      field.placeholder,
      field.key,
      defs[field.key]?.label,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return haystack.includes(searchQuery)
  }

  function getVisibleFields(section: AdminSettingSection) {
    return section.fields.filter(field => {
      if (showDirtyOnly && !dirtyKeys.has(field.key)) return false
      return fieldMatchesSearch(section, field)
    })
  }

  const filteredSections = useMemo(
    () =>
      sections
        .map(section => ({ ...section, fields: getVisibleFields(section) }))
        .filter(section => section.fields.length > 0),
    [defs, dirtyKeys, searchQuery, sections, showDirtyOnly],
  )

  const dirtySectionCount = useMemo(
    () => sections.filter(section => getDirtyKeysForSection(section).length > 0).length,
    [dirtyKeys, sections],
  )
  const firstDirtySectionId = useMemo(
    () => sections.find(section => getDirtyKeysForSection(section).length > 0)?.id ?? null,
    [dirtyKeys, sections],
  )
  const lastSavedAt = useMemo(() => {
    const values = Object.values(savedSectionTimestamps)
    if (values.length === 0) return null
    return Math.max(...values)
  }, [savedSectionTimestamps])
  const selectedSectionId = isCompactMode ? null : searchParams.get('section')
  const selectedSection = useMemo(
    () => (selectedSectionId ? sections.find(section => section.id === selectedSectionId) ?? null : null),
    [sections, selectedSectionId],
  )
  const selectedSectionFields = useMemo(() => {
    if (!selectedSection) return []

    return selectedSection.fields.filter(field => {
      if (showDirtyOnly && !dirtyKeys.has(field.key)) return false
      return fieldMatchesSearch(selectedSection, field)
    })
  }, [dirtyKeys, searchQuery, selectedSection, showDirtyOnly])
  const selectedSectionIndex = useMemo(
    () => (selectedSection ? sections.findIndex(section => section.id === selectedSection.id) : -1),
    [sections, selectedSection],
  )
  const previousSection = selectedSectionIndex > 0 ? sections[selectedSectionIndex - 1] : null
  const nextSection = selectedSectionIndex >= 0 && selectedSectionIndex < sections.length - 1 ? sections[selectedSectionIndex + 1] : null

  function resetFieldToSaved(key: string) {
    setDirty(current => {
      if (current[key] === undefined) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  function resetFieldToDefault(key: string) {
    setDirty(current => ({ ...current, [key]: defs[key]?.default ?? '' }))
  }

  function clearSectionChanges(section: AdminSettingSection) {
    setDirty(current => {
      const next = { ...current }
      section.fields.forEach(field => {
        delete next[field.key]
      })
      return next
    })
  }

  function openSection(sectionId: string) {
    if (isCompactMode) return

    router.replace(buildSectionHref(pathname, currentSearch, sectionId), { scroll: false })
  }

  function closeSection() {
    if (isCompactMode) return

    router.replace(buildSectionHref(pathname, currentSearch, null), { scroll: false })
  }

  async function saveKeys(keys: string[], target: string) {
    const payload = Object.fromEntries(keys.filter(key => dirty[key] !== undefined).map(key => [key, dirty[key]]))
    if (Object.keys(payload).length === 0) {
      toast('这一组没有改动', 'info')
      return
    }

    setSavingTarget(target)
    try {
      const res = await fetch('/api/houtai/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('save failed')

      const savedAt = Date.now()
      const touchedSectionIds = sections
        .filter(section => section.fields.some(field => payload[field.key] !== undefined))
        .map(section => section.id)

      setSettings(current => ({ ...current, ...payload }))
      setDirty(current => {
        const next = { ...current }
        keys.forEach(key => {
          delete next[key]
        })
        return next
      })
      setSavedSectionTimestamps(current => {
        const next = { ...current }
        touchedSectionIds.forEach(sectionId => {
          next[sectionId] = savedAt
        })
        return next
      })
      toast(target === 'all' ? '全部设置已保存' : '本组设置已保存')
    } catch {
      toast('保存失败，请稍后重试', 'error')
    } finally {
      setSavingTarget(null)
    }
  }

  async function changePassword() {
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast('请填写完整密码信息', 'error')
      return
    }
    if (newPassword !== confirmPassword) {
      toast('两次新密码不一致', 'error')
      return
    }
    if (newPassword.length < 8) {
      toast('新密码至少 8 位', 'error')
      return
    }

    const approved = await confirm('修改密码', '确认更新管理员登录密码？更新后会立即生效。', {
      confirmLabel: '确认修改',
    })
    if (!approved) return

    setPasswordSaving(true)
    try {
      const res = await fetch('/api/houtai/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(String(data?.error || '密码修改失败'))
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast(data.message || '管理员密码已更新')
    } catch (error) {
      toast(error instanceof Error ? error.message : '密码修改失败', 'error')
    } finally {
      setPasswordSaving(false)
    }
  }
  function renderField(field: AdminSettingField) {
    const resolvedHint = field.hint
    const currentValue = getSettingValue(field.key)
    const savedValue = getSavedValue(field.key)
    const defaultValue = defs[field.key]?.default ?? ''
    const fieldDirty = dirty[field.key] !== undefined && currentValue !== savedValue
    const fieldSensitive = field.kind === 'password' || /(?:apiKey|secret|webhook|token)/i.test(field.key)
    const canResetToSaved = dirty[field.key] !== undefined
    const canResetToDefault = field.kind !== 'password' && currentValue !== defaultValue
    const fieldStatus = (
      <>
        {fieldDirty ? (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
            已修改
          </span>
        ) : (
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500">
            已保存
          </span>
        )}
        {fieldSensitive ? (
          <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700">
            敏感项
          </span>
        ) : null}
      </>
    )
    const fieldActions = (
      <>
        <button
          type="button"
          onClick={() => resetFieldToSaved(field.key)}
          disabled={!canResetToSaved}
          className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          恢复已保存
        </button>
        <button
          type="button"
          onClick={() => resetFieldToDefault(field.key)}
          disabled={!canResetToDefault}
          className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-600 transition hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          恢复默认
        </button>
      </>
    )

    if (field.kind === 'image') {
      return (
        <ImageSettingField
          label={field.label}
          hint={resolvedHint}
          status={fieldStatus}
          actions={fieldActions}
          value={currentValue}
          onChange={value => setSettingValue(field.key, value)}
        />
      )
    }

    if (field.kind === 'toggle') {
      return (
        <FormRow key={field.key} label={field.label} hint={resolvedHint} status={fieldStatus} actions={fieldActions}>
          <ToggleSwitch
            value={currentValue === 'true'}
            onChange={value => setSettingValue(field.key, value ? 'true' : 'false')}
          />
        </FormRow>
      )
    }

    if (field.kind === 'select') {
      return (
        <FormRow key={field.key} label={field.label} hint={resolvedHint} status={fieldStatus} actions={fieldActions}>
          <div className="space-y-3">
            <select
              className="field"
              value={currentValue}
              onChange={event => setSettingValue(field.key, event.target.value)}
            >
              {(field.options ?? []).map(option => (
                <option key={`${field.key}-${option.value || 'default'}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {field.key === 'poster.fontFamily' ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Poster Preview</p>
                <div className="mt-3 space-y-2" style={{ fontFamily: resolveSharedFontStack(currentValue) }}>
                  <p className="text-2xl font-semibold text-slate-800">纸杯的自留地</p>
                  <p className="text-sm leading-6 text-slate-500">二维码优先完整展示，扫一下就能继续阅读原文。</p>
                  <p className="text-xs text-slate-400">zb2026.top</p>
                </div>
              </div>
            ) : null}
          </div>
        </FormRow>
      )
    }

    if (field.kind === 'textarea') {
      return (
        <FormRow key={field.key} label={field.label} hint={resolvedHint} status={fieldStatus} actions={fieldActions}>
          <textarea
            className="field resize-y"
            rows={field.rows ?? 4}
            value={currentValue}
            onChange={event => setSettingValue(field.key, event.target.value)}
            placeholder={field.placeholder}
          />
        </FormRow>
      )
    }

    const inputType = field.kind === 'number' ? 'number' : field.kind === 'email' ? 'email' : field.kind === 'password' ? 'password' : 'text'
    const inputValue = field.kind === 'password' ? dirty[field.key] ?? '' : getSettingValue(field.key)
    const placeholder =
      field.kind === 'password'
        ? field.placeholder || '已加密保存，留空保持原值'
        : field.placeholder

    return (
      <FormRow key={field.key} label={field.label} hint={resolvedHint} status={fieldStatus} actions={fieldActions}>
        <input
          type={inputType}
          className={`field ${field.kind === 'number' ? 'max-w-[180px]' : ''} ${field.kind === 'password' ? 'font-mono text-xs' : ''}`}
          value={inputValue}
          min={field.min}
          max={field.max}
          onChange={event => setSettingValue(field.key, event.target.value)}
          placeholder={placeholder}
          autoComplete={field.kind === 'email' ? 'email' : field.kind === 'password' ? 'new-password' : undefined}
        />
      </FormRow>
    )
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-slate-400">加载设置中…</div>
  }

  return (
    <div id="control-center" className="space-y-6">
      {dialog}

      {!isCompactMode ? (
        <PageHeader
          title={selectedSection ? `${title} · ${selectedSection.title}` : title}
          subtitle={
            selectedSection
              ? '当前只进入一个分组单独编辑，避免所有设置同时摊开。'
              : subtitle
          }
          action={
            selectedSection ? (
              <button
                type="button"
                onClick={closeSection}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
              >
                返回全部板块
              </button>
            ) : null
          }
        />
      ) : null}

      {isCompactMode ? (
        <Card className="overflow-hidden border-slate-200">
          <div className="space-y-5 p-5 sm:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Settings Workspace</p>
                  <Link
                    href={fullPageHref}
                    className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-500 transition hover:border-slate-300 hover:bg-white hover:text-slate-700"
                  >
                    进入完整设置页 →
                  </Link>
                </div>
                <h2 className="mt-2 text-lg font-semibold text-slate-900">{title}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">共 {sections.length} 组</span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500">有改动 {dirtySectionCount} 组</span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500">最近保存 {formatSavedTime(lastSavedAt)}</span>
              </div>
            </div>

            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="搜索要进入的设置板块"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowDirtyOnly(current => !current)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    showDirtyOnly
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {showDirtyOnly ? '只看改动中' : '筛改动'}
                </button>
                {(searchQuery || showDirtyOnly) ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('')
                      setShowDirtyOnly(false)
                    }}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300"
                  >
                    清空筛选
                  </button>
                ) : null}
              </div>
            </div>

            {filteredSections.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-12 text-center text-sm text-slate-400">
                当前筛选没有匹配结果
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredSections.map(section => {
                  const sourceSection = sections.find(item => item.id === section.id) ?? section
                  const dirtyCountForSection = getDirtyKeysForSection(sourceSection).length
                  const sectionMeta = getSectionMeta(sourceSection.id)

                  return (
                    <Link
                      key={section.id}
                      href={`${fullPageHref}?section=${section.id}`}
                      className="rounded-[24px] border border-slate-200 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-base font-semibold text-slate-800">{section.title}</span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
                          {section.fields.length} 字段
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${sectionMeta.tone}`}>
                          {sectionMeta.label}
                        </span>
                        <span className="text-[11px] text-slate-400">上次保存 {formatSavedTime(savedSectionTimestamps[section.id])}</span>
                        {dirtyCountForSection > 0 ? (
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">
                            {dirtyCountForSection} 项待保存
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-500">{section.description}</p>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </Card>
      ) : selectedSection ? (
        <>
          <Card className="overflow-hidden border-slate-200">
            <div className="space-y-5 p-5 sm:p-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={closeSection}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-white"
                    >
                      ← 返回板块列表
                    </button>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${getSectionMeta(selectedSection.id).tone}`}>
                      {getSectionMeta(selectedSection.id).label}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
                      最近保存 {formatSavedTime(savedSectionTimestamps[selectedSection.id])}
                    </span>
                  </div>
                  <h2 className="mt-3 text-xl font-semibold text-slate-900">{selectedSection.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{selectedSection.description}</p>
                  <p className="mt-2 text-xs leading-5 text-slate-400">{getSectionMeta(selectedSection.id).note}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {previousSection ? (
                    <button
                      type="button"
                      onClick={() => openSection(previousSection.id)}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                    >
                      ← 上一组
                    </button>
                  ) : null}
                  {nextSection ? (
                    <button
                      type="button"
                      onClick={() => openSection(nextSection.id)}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                    >
                      下一组 →
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => clearSectionChanges(selectedSection)}
                    disabled={getDirtyKeysForSection(selectedSection).length === 0 || savingTarget !== null}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    恢复本组改动
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveKeys(selectedSection.fields.map(field => field.key), selectedSection.id)}
                    disabled={getDirtyKeysForSection(selectedSection).length === 0 || savingTarget !== null}
                    className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingTarget === selectedSection.id ? '保存中…' : '保存本组'}
                  </button>
                </div>
              </div>

              <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder={`搜索 ${selectedSection.title} 内的字段`}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDirtyOnly(current => !current)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      showDirtyOnly
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {showDirtyOnly ? '只看改动中' : '只看改动项'}
                  </button>
                  {(searchQuery || showDirtyOnly) ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch('')
                        setShowDirtyOnly(false)
                      }}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300"
                    >
                      清空筛选
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void saveKeys(Array.from(dirtyKeys), 'all')}
                    disabled={dirtyCount === 0 || savingTarget !== null}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    保存全部修改
                  </button>
                </div>
              </div>
            </div>
          </Card>

          <section id={`settings-${selectedSection.id}`}>
            <Card className="overflow-hidden border-slate-200">
              <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
                <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-slate-200">本组共 {selectedSection.fields.length} 项</span>
                  <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-slate-200">当前展示 {selectedSectionFields.length} 项</span>
                  <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-slate-200">待保存 {getDirtyKeysForSection(selectedSection).length} 项</span>
                </div>
              </div>
              {selectedSectionFields.length === 0 ? (
                <div className="px-6 py-12 text-center text-sm text-slate-400">
                  当前筛选下没有字段可显示，试试清空搜索或关闭“只看改动项”。
                </div>
              ) : (
                <div className={selectedSectionFields.some(isLongField) ? 'space-y-5 p-5 sm:p-6' : 'grid gap-5 p-5 sm:p-6 xl:grid-cols-2'}>
                  {selectedSectionFields.map(field => (
                    <div key={field.key} className={selectedSectionFields.some(isLongField) || isLongField(field) ? '' : 'xl:col-span-1'}>
                      {renderField(field)}
                    </div>
                  ))}

                  {selectedSection.id === 'security' ? (
                    <div className="xl:col-span-2">
                      <Card className="border border-slate-200 bg-slate-50 p-5 shadow-none">
                        <div className="mb-4">
                          <h3 className="text-sm font-semibold text-slate-800">修改管理员密码</h3>
                          <p className="mt-1 text-xs leading-5 text-slate-500">修改后立即生效，建议保存后重新登录确认。</p>
                        </div>
                        <div className="grid gap-4 md:grid-cols-3">
                          <input
                            type="password"
                            className="field"
                            value={oldPassword}
                            onChange={event => setOldPassword(event.target.value)}
                            placeholder="旧密码"
                            autoComplete="current-password"
                          />
                          <input
                            type="password"
                            className="field"
                            value={newPassword}
                            onChange={event => setNewPassword(event.target.value)}
                            placeholder="新密码（至少 8 位）"
                            autoComplete="new-password"
                          />
                          <input
                            type="password"
                            className="field"
                            value={confirmPassword}
                            onChange={event => setConfirmPassword(event.target.value)}
                            placeholder="确认新密码"
                            autoComplete="new-password"
                          />
                        </div>
                        <div className="mt-4 flex justify-end">
                          <button
                            type="button"
                            onClick={() => void changePassword()}
                            disabled={passwordSaving}
                            className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {passwordSaving ? '更新中…' : '更新密码'}
                          </button>
                        </div>
                      </Card>
                    </div>
                  ) : null}

                  {selectedSection.id === 'analytics' ? (
                    <div className="xl:col-span-2">
                      <Card className="border border-slate-200 bg-slate-50 p-5 shadow-none">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h3 className="text-sm font-semibold text-slate-800">一键加入当前设备白名单</h3>
                            <p className="mt-1 text-xs leading-5 text-slate-500">
                              这里会生成当前设备的精确签名并写入白名单，避免手动填写时把真实访客误排除。
                            </p>
                          </div>
                          <OwnerDeviceAllowlistButton />
                        </div>
                      </Card>
                    </div>
                  ) : null}

                  {selectedSection.id === 'ai' ? (
                    <MascotWorkbench draftSettings={effectiveSettings} />
                  ) : null}
                </div>
              )}
            </Card>
          </section>
        </>
      ) : (
        <Card className="overflow-hidden border-slate-200">
          <div className="space-y-5 p-5 sm:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Section Navigator</p>
                <h2 className="mt-2 text-lg font-semibold text-slate-900">先选择要进入的设置板块</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  这里不再把所有表单整页铺开，而是先按板块收纳；点击卡片后进入对应分组单独编辑。
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">未保存 {dirtyCount} 项</span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500">当前分组 {filteredSections.length}/{sections.length}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500">最近保存 {formatSavedTime(lastSavedAt)}</span>
                <button
                  type="button"
                  onClick={() => void saveKeys(Array.from(dirtyKeys), 'all')}
                  disabled={dirtyCount === 0 || savingTarget !== null}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingTarget === 'all' ? '保存中…' : '保存全部修改'}
                </button>
              </div>
            </div>

            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="搜索要进入的设置板块"
              />
              <div className="flex flex-wrap gap-2">
                {firstDirtySectionId ? (
                  <button
                    type="button"
                    onClick={() => openSection(firstDirtySectionId)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300"
                  >
                    跳到第一处改动
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setShowDirtyOnly(current => !current)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    showDirtyOnly
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {showDirtyOnly ? '只看改动中' : '筛改动'}
                </button>
                {(searchQuery || showDirtyOnly) ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('')
                      setShowDirtyOnly(false)
                    }}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300"
                  >
                    清空筛选
                  </button>
                ) : null}
              </div>
            </div>

            {filteredSections.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-12 text-center text-sm text-slate-400">
                当前筛选没有匹配结果
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredSections.map(section => {
                  const sourceSection = sections.find(item => item.id === section.id) ?? section
                  const dirtyCountForSection = getDirtyKeysForSection(sourceSection).length
                  const sectionMeta = getSectionMeta(sourceSection.id)

                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => openSection(section.id)}
                      className="rounded-[24px] border border-slate-200 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-base font-semibold text-slate-800">{section.title}</span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
                          {section.fields.length} 字段
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${sectionMeta.tone}`}>
                          {sectionMeta.label}
                        </span>
                        <span className="text-[11px] text-slate-400">上次保存 {formatSavedTime(savedSectionTimestamps[section.id])}</span>
                        {dirtyCountForSection > 0 ? (
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">
                            {dirtyCountForSection} 项待保存
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-500">{section.description}</p>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
